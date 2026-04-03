import type { Express } from "express";
import { pickDeps, type ServerRouteDeps } from "./route-deps";
import { z } from "zod";
import { getServerEnv } from "../env";
import { isDisposableEmailDomain, normalizeEmail } from "../services/email-policy";

export function registerSupabaseUserRoutes(app: Express, deps: ServerRouteDeps) {
  const {
    assignSupabaseBuildingToUser,
    bcrypt,
    createSupabaseNotification,
    createSupabaseUser,
    crypto,
    deleteSupabaseUser,
    getSupabaseUserById,
    isMissingFullAccessColumnError,
    listBuildings: listSupabaseBuildings,
    listSyndicUsers: listSupabaseSyndicUsers,
    listTeamMembers: listSupabaseTeamMembers,
    replaceUserBuildings,
    generateEmailTemplate,
    resend,
    supabaseEmailExists,
    updateUser: updateSupabaseUser,
    createCompany,
    getCompanyByUserId,
    updateCompany,
  } = pickDeps(deps);
  const getAuthUser = (req: any) => {
    const auth = req.authUser;
    if (!auth?.userId || !auth?.role) return null;
    return { userId: Number(auth.userId), role: String(auth.role) };
  };
  const canManageTeamFor = async (req: any, parentUserId: number) => {
    const auth = getAuthUser(req);
    if (!auth) return false;
    if (auth.role === "admin") return true;
    return auth.role === "syndic" && auth.userId === Number(parentUserId);
  };
  const isStrongEnoughPassword = (value: unknown) => String(value || "").length >= 8;
  const createVerificationToken = () => crypto.randomBytes(32).toString("hex");
  const resolveAppBaseUrl = (req: any) => {
    const host = req.get?.("host") || req.headers.host;
    const proto = req.protocol || (req.headers["x-forwarded-proto"] as string) || "http";
    return `${proto}://${host}`;
  };

  app.get("/api/users", async (req, res) => {
    const auth = getAuthUser(req);
    if (!auth || auth.role !== "admin") {
      return res.status(403).json({ error: "Acces reserve a l'administrateur." });
    }
    res.json(await listSupabaseSyndicUsers());
  });

  app.get("/api/users/:id/team", async (req, res) => {
    if (!(await canManageTeamFor(req, Number(req.params.id)))) {
      return res.status(403).json({ error: "Acces refuse." });
    }
    res.json(await listSupabaseTeamMembers(req.params.id));
  });

  app.post("/api/users/:id/team", async (req, res) => {
    if (!(await canManageTeamFor(req, Number(req.params.id)))) {
      return res.status(403).json({ error: "Acces refuse." });
    }
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      confirm_password: z.string().min(8),
      name: z.string().optional(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
      has_full_building_access: z.boolean().optional(),
      buildingIds: z.array(z.number()).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Payload invalide." });
    }
    const { email, password, confirm_password, name, first_name, last_name, has_full_building_access, buildingIds } = parsed.data;
    const env = getServerEnv();
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return res.status(400).json({ error: "Email invalide." });
    }
    if (confirm_password != null && String(password || "") !== String(confirm_password || "")) {
      return res.status(400).json({ error: "Les mots de passe ne correspondent pas." });
    }
    if (!isStrongEnoughPassword(password)) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caracteres." });
    }
    if (isDisposableEmailDomain(normalizedEmail, env.blockedEmailDomains)) {
      return res.status(400).json({ error: "Les adresses email jetables ne sont pas autorisees." });
    }
    if (await supabaseEmailExists(normalizedEmail)) {
      return res.status(400).json({ error: "Cet email est déjà utilisé." });
    }

    const hashedPassword = bcrypt.hashSync(password || crypto.randomBytes(12).toString("hex"), 10);
    const verificationToken = createVerificationToken();
    const user = await createSupabaseUser({
      email: normalizedEmail,
      password: hashedPassword,
      name,
      first_name: first_name || null,
      last_name: last_name || null,
      role: "placeur",
      profile_completed: 0,
      email_verified: 0,
      parent_id: req.params.id,
      verification_token: verificationToken,
    });

    let assignedBuildingIds = Array.isArray(buildingIds) ? buildingIds : [];
    if (has_full_building_access) {
      assignedBuildingIds = (await listSupabaseBuildings("syndic", Number(req.params.id))).map((building) => Number(building.id));
      try {
        await updateSupabaseUser(user.id, { has_full_building_access: 1 });
      } catch (error) {
        if (!isMissingFullAccessColumnError(error)) throw error;
      }
    }

    if (assignedBuildingIds.length > 0) {
      await replaceUserBuildings(user.id, assignedBuildingIds);
    }

    try {
      const appBaseUrl = resolveAppBaseUrl(req);
      const activationLink = `${appBaseUrl}/placeur/activation?token=${verificationToken}`;
      await resend.emails.send({
        from: "Plachet <info@plachet.be>",
        to: normalizedEmail,
        subject: "Activez votre accès placeur Plachet",
        html: generateEmailTemplate(
          "Bienvenue, complétez votre profil",
          `<p style="margin-top:0;">Bonjour <strong>${name || first_name || "Placeur"}</strong>,</p>
           <p>Un compte placeur a été créé pour vous. Avant de commencer, définissez votre mot de passe et complétez vos informations de contact.</p>
           <p><a href="${activationLink}" style="display:inline-block;padding:14px 20px;background:#000;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Activer mon compte</a></p>
           <p style="font-size:13px;color:#71717a;">Ou copiez-collez ce lien : ${activationLink}</p>`
        ),
      });
    } catch (error) {
      console.error("Failed to send placeur invite email:", error);
    }

    res.json({ id: user.id });
  });

  app.patch("/api/users/team/:memberId/access", async (req, res) => {
    const { has_full_building_access, buildingIds } = req.body;
    const teamMember = await getSupabaseUserById(req.params.memberId);
    if (!teamMember?.parent_id) {
      return res.status(404).json({ error: "Membre introuvable" });
    }
    if (!(await canManageTeamFor(req, Number(teamMember.parent_id)))) {
      return res.status(403).json({ error: "Acces refuse." });
    }

    let assignedBuildingIds = Array.isArray(buildingIds) ? buildingIds : [];
    if (has_full_building_access) {
      assignedBuildingIds = (await listSupabaseBuildings("syndic", Number(teamMember.parent_id))).map((building) =>
        Number(building.id),
      );
    }

    try {
      await updateSupabaseUser(req.params.memberId, {
        has_full_building_access: has_full_building_access ? 1 : 0,
      });
    } catch (error) {
      if (!isMissingFullAccessColumnError(error)) throw error;
    }

    await replaceUserBuildings(req.params.memberId, assignedBuildingIds);
    res.json({ success: true });
  });

  app.delete("/api/users/team/:memberId", async (req, res) => {
    const teamMember = await getSupabaseUserById(req.params.memberId);
    if (teamMember?.parent_id) {
      if (!(await canManageTeamFor(req, Number(teamMember.parent_id)))) {
        return res.status(403).json({ error: "Acces refuse." });
      }
      await deleteSupabaseUser(req.params.memberId);
    }
    res.json({ success: true });
  });

  app.post("/api/users", async (req, res) => {
    const auth = getAuthUser(req);
    if (!auth || auth.role !== "admin") {
      return res.status(403).json({ error: "Acces reserve a l'administrateur." });
    }
    const { email, password, confirm_password, name, first_name, last_name, buildingIds } = req.body;
    const env = getServerEnv();
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return res.status(400).json({ error: "Email invalide." });
    }
    if (confirm_password != null && String(password || "") !== String(confirm_password || "")) {
      return res.status(400).json({ error: "Les mots de passe ne correspondent pas." });
    }
    if (!isStrongEnoughPassword(password)) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caracteres." });
    }
    if (isDisposableEmailDomain(normalizedEmail, env.blockedEmailDomains)) {
      return res.status(400).json({ error: "Les adresses email jetables ne sont pas autorisees." });
    }
    if (await supabaseEmailExists(normalizedEmail)) {
      return res.status(400).json({ error: "Cet email est déjà utilisé." });
    }
    const hashedPassword = bcrypt.hashSync(password, 10);
    const user = await createSupabaseUser({
      email: normalizedEmail,
      password: hashedPassword,
      name,
      first_name: first_name || null,
      last_name: last_name || null,
      role: "syndic",
      profile_completed: 0,
    });

    if (buildingIds && Array.isArray(buildingIds)) {
      for (const buildingId of buildingIds) {
        await assignSupabaseBuildingToUser(user.id, buildingId);
      }
    }

    await createSupabaseNotification({
      user_id: user.id,
      type: "welcome",
      title: "Bienvenue chez Plachet !",
      message:
        "Votre compte a été créé par un administrateur. Veuillez compléter vos informations professionnelles dans votre profil pour finaliser votre inscription.",
    });

    res.json({ id: user.id });
  });

  app.post("/api/users/update-profile", async (req, res) => {
    const { id, company_name, phone, street, number, box, zip, city, vat_number, first_name, last_name, bce_number, ipi_number, is_ipi_certified, is_vat_liable } =
      req.body;
    const auth = getAuthUser(req);
    if (!auth) return res.status(401).json({ error: "Authentification requise." });
    if (auth.role !== "admin" && Number(id) !== auth.userId) {
      return res.status(403).json({ error: "Acces refuse." });
    }

    // Update user (personal info)
    await updateSupabaseUser(id, {
      first_name: first_name || null,
      last_name: last_name || null,
      phone,
      profile_completed: 1,
    });

    // Update or create company (professional info)
    const address = `${street} ${number}${box ? ` bte ${box}` : ""}, ${zip} ${city}`;
    const companyData = {
      company_name: company_name || null,
      phone: phone || null,
      address,
      street: street || null,
      number: number || null,
      box: box || null,
      zip: zip || null,
      city: city || null,
      vat_number: vat_number || null,
      bce_number: bce_number || null,
      ipi_number: ipi_number || null,
      is_ipi_certified: is_ipi_certified ? true : false,
      is_vat_liable: is_vat_liable != null ? Boolean(is_vat_liable) : true,
    };

    const existing = await getCompanyByUserId(id);
    if (existing) {
      await updateCompany(id, companyData);
    } else {
      await createCompany({ user_id: Number(id), ...companyData });
    }

    res.json({ success: true });
  });

  app.post("/api/users/delete-account", async (req, res) => {
    const { id } = req.body;
    const auth = getAuthUser(req);
    if (!auth) return res.status(401).json({ error: "Authentification requise." });
    if (auth.role !== "admin" && Number(id) !== auth.userId) {
      return res.status(403).json({ error: "Acces refuse." });
    }
    const user = await getSupabaseUserById(id);

    if (!user) {
      return res.status(404).json({ error: "Compte introuvable." });
    }

    if (user.role === "admin") {
      return res.status(403).json({ error: "Ce compte ne peut pas etre supprime depuis l'interface." });
    }

    if (!user.parent_id) {
      const teamMembers = await listSupabaseTeamMembers(user.id);
      if (teamMembers.length > 0) {
        return res.status(400).json({ error: "Supprimez d'abord les collaborateurs rattaches a ce compte." });
      }
    }

    const anonymizedEmail = `deleted+${user.id}+${Date.now()}@plachet.local`;
    const anonymizedPassword = bcrypt.hashSync(crypto.randomBytes(32).toString("hex"), 10);

    await replaceUserBuildings(user.id, []);
    // Delete company data
    await getCompanyByUserId(user.id).then((c: any) => c && updateCompany(user.id, {
      company_name: null, phone: null, address: null, street: null, number: null,
      box: null, zip: null, city: null, vat_number: null, bce_number: null,
      ipi_number: null, is_ipi_certified: false,
    })).catch(() => {});

    await updateSupabaseUser(user.id, {
      email: anonymizedEmail,
      password: anonymizedPassword,
      name: "Compte supprime",
      first_name: null,
      last_name: null,
      phone: null,
      profile_completed: 0,
      email_verified: 0,
      verification_token: null,
      reset_token: null,
      reset_token_expires: null,
      parent_id: null,
      has_full_building_access: 0,
    });

    res.json({ success: true });
  });
}
