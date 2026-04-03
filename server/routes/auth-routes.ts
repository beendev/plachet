import type { Express, Request } from "express";
import { pickDeps, type ServerRouteDeps } from "./route-deps";
import { getServerEnv } from "../env";
import { createSessionToken } from "../services/session-token";
import { isDisposableEmailDomain, normalizeEmail } from "../services/email-policy";
import { z } from "zod";

export function registerSupabaseAuthRoutes(app: Express, deps: ServerRouteDeps) {
  const {
    bcrypt,
    createCompany,
    getCompanyByUserId,
    createSupabaseNotification,
    createSupabaseUser,
    crypto,
    generateEmailTemplate,
    getSupabaseUserByEmail,
    getSupabaseUserByResetToken,
    getSupabaseUserByVerificationToken,
    resend,
    updateUser: updateSupabaseUser,
  } = pickDeps(deps);
  const resolveAppBaseUrl = (req: Request) => {
    const env = getServerEnv();
    if (env.appUrl) return env.appUrl.replace(/\/$/, "");
    const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
    const forwardedHost = String(req.headers["x-forwarded-host"] || "").split(",")[0].trim();
    if (forwardedProto && forwardedHost) {
      return `${forwardedProto}://${forwardedHost}`.replace(/\/$/, "");
    }
    const origin = String(req.headers.origin || "").trim();
    if (origin) return origin.replace(/\/$/, "");
    return `${req.protocol}://${req.get("host")}`;
  };
  const sanitizeAuthUser = (user: any) => {
    if (!user || typeof user !== "object") return user;
    const {
      password,
      reset_token,
      reset_token_expires,
      verification_token,
      ...safeUser
    } = user;
    return safeUser;
  };
  const isStrongEnoughPassword = (value: unknown) => String(value || "").length >= 8;
  const escapeHtml = (value: unknown) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  const sendVerificationPage = (
    res: any,
    options: {
      statusCode?: number;
      title: string;
      heading: string;
      message: string;
      ctaLabel?: string;
      ctaHref?: string;
      accentColor?: string;
    },
  ) => {
    const statusCode = options.statusCode ?? 200;
    const accentColor = options.accentColor || "#10b981";
    const ctaHref = options.ctaHref || "/";
    const ctaLabel = options.ctaLabel || "Aller a la connexion";
    return res.status(statusCode).send(`
      <html>
        <head>
          <title>${escapeHtml(options.title)}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f4f4f5; }
            .card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); text-align: center; max-width: 440px; width: 90%; }
            h1 { color: ${accentColor}; margin-top: 0; }
            p { color: #52525b; line-height: 1.5; margin-bottom: 0; }
            a { display: inline-block; margin-top: 24px; padding: 12px 24px; background: #18181b; color: white; text-decoration: none; border-radius: 12px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>${escapeHtml(options.heading)}</h1>
            <p>${escapeHtml(options.message)}</p>
            <a href="${escapeHtml(ctaHref)}">${escapeHtml(ctaLabel)}</a>
          </div>
        </body>
      </html>
    `);
  };
  const markUserEmailVerified = async (userId: number | string) => {
    try {
      await updateSupabaseUser(userId, { email_verified: true, verification_token: null });
    } catch (error: any) {
      const message = String(error?.message || error?.details || error || "").toLowerCase();
      if (!message.includes("boolean")) throw error;
      await updateSupabaseUser(userId, { email_verified: 1, verification_token: null });
    }
  };

  app.post("/api/auth/login", async (req, res) => {
    const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Payload invalide." });
    const { email, password } = parsed.data;
    const normalizedEmail = normalizeEmail(email);
    const user = await getSupabaseUserByEmail(normalizedEmail);

    if (!user) {
      return res.status(401).json({ error: "Identifiants invalides" });
    }

    let isValid = false;
    try {
      isValid = bcrypt.compareSync(password, user.password);
    } catch {
      isValid = false;
    }

    if (!isValid) {
      return res.status(401).json({ error: "Identifiants invalides" });
    }

    if (user.role !== "admin" && !user.email_verified) {
      return res.status(403).json({
        error: "Veuillez vérifier votre adresse email avant de vous connecter. Vérifiez vos spams si nécessaire.",
      });
    }

    const env = getServerEnv();
    const sessionSecret = env.sessionSecret || env.supabaseServiceRoleKey;
    const token = createSessionToken({ userId: user.id, role: user.role }, sessionSecret);

    // Merge company data into user response for frontend compatibility
    const company = await getCompanyByUserId(user.id).catch(() => null);
    const safeUser = sanitizeAuthUser(user);
    if (company) {
      safeUser.company_name = company.company_name;
      safeUser.vat_number = company.vat_number;
      safeUser.bce_number = company.bce_number;
      safeUser.ipi_number = company.ipi_number;
      safeUser.is_ipi_certified = company.is_ipi_certified;
      safeUser.is_vat_liable = company.is_vat_liable;
      safeUser.address = company.address;
      safeUser.street = company.street;
      safeUser.number = company.number;
      safeUser.box = company.box;
      safeUser.zip = company.zip;
      safeUser.city = company.city;
    }
    res.json({ user: safeUser, token });
  });

  app.post("/api/auth/resend-verification", async (req, res) => {
    const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Email invalide." });
    const { email } = parsed.data;
    const normalizedEmail = normalizeEmail(email);
    const user = await getSupabaseUserByEmail(normalizedEmail);

    // Always return success to prevent email enumeration
    if (!user || user.email_verified) {
      return res.json({ success: true });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    await updateSupabaseUser(user.id, { verification_token: verificationToken });

    const verificationUrl = `${resolveAppBaseUrl(req)}/api/auth/verify?token=${verificationToken}`;
    try {
      await resend.emails.send({
        from: "Plachet <info@plachet.be>",
        to: normalizedEmail,
        subject: "Vérifiez votre adresse email - Plachet",
        html: generateEmailTemplate(
          "Vérification de votre email",
          `
          <p style="margin-top: 0;">Bonjour <strong>${user.name || "Syndic"}</strong>,</p>
          <p>Cliquez sur le bouton ci-dessous pour vérifier votre adresse email :</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="display: inline-block; padding: 14px 28px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Vérifier mon email</a>
          </div>
          <p style="margin-bottom: 0; font-size: 12px; color: #71717a; word-break: break-all;">Si le bouton ne fonctionne pas, copiez-collez ce lien :<br><br>${verificationUrl}</p>
          `,
        ),
      });
    } catch (emailError) {
      console.error("Failed to resend verification email:", emailError);
    }

    res.json({ success: true });
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Email invalide." });
    const { email } = parsed.data;
    const normalizedEmail = normalizeEmail(email);
    const user = await getSupabaseUserByEmail(normalizedEmail);

    if (!user) {
      return res.json({ success: true });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000).toISOString();
    await updateSupabaseUser(user.id, { reset_token: token, reset_token_expires: expires });

    const resetLink = `${resolveAppBaseUrl(req)}/reset-password?token=${token}`;

    try {
      const { error } = await resend.emails.send({
        from: "Plachet <info@plachet.be>",
        to: user.email,
        subject: "Réinitialisation de votre mot de passe Plachet",
        html: generateEmailTemplate(
          "Definissez votre mot de passe",
          `
          <p style="margin-top: 0;">Bonjour <strong>${user.name || "Syndic"}</strong>,</p>
          <p>Un acces a l'espace Plachet est disponible pour cette adresse email.</p>
          <p>Pour definir ou modifier votre mot de passe, cliquez sur le bouton ci-dessous :</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="display: inline-block; padding: 14px 28px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Definir mon mot de passe</a>
          </div>
          <p style="font-size: 14px; color: #71717a;">Ce lien est securise et valable pendant 1 heure.</p>
          <p style="font-size: 14px; color: #71717a;">Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :</p>
          <p style="margin: 0 0 20px 0; font-size: 13px; color: #18181b; word-break: break-all;">${resetLink}</p>
          <p style="margin-bottom: 0; font-size: 14px; color: #71717a;">Si vous n'etes pas a l'origine de cette demande, vous pouvez ignorer cet email.</p>
          `,
        ),
      });

      if (error) {
        return res.status(500).json({ error: `Erreur Resend: ${error.message}` });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Resend error:", error);
      res.status(500).json({ error: "Erreur lors de l'envoi de l'email" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const parsed = z.object({
      token: z.string().min(1),
      password: z.string().min(8),
      confirm_password: z.string().min(8),
    }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Payload invalide." });
    const { token, password, confirm_password } = parsed.data;
    if (confirm_password != null && String(password || "") !== String(confirm_password || "")) {
      return res.status(400).json({ error: "Les mots de passe ne correspondent pas." });
    }
    if (!isStrongEnoughPassword(password)) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caracteres." });
    }
    const user = await getSupabaseUserByResetToken(token, new Date().toISOString());

    if (!user) {
      return res.status(400).json({ error: "Lien invalide ou expiré" });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    await updateSupabaseUser(user.id, {
      password: hashedPassword,
      reset_token: null,
      reset_token_expires: null,
    });

    res.json({ success: true });
  });

  app.post("/api/placeurs/activate", async (req, res) => {
    const parsed = z
      .object({
        token: z.string().min(1),
        password: z.string().min(8),
        phone: z.string().optional(),
        address: z.string().optional(),
        street: z.string().optional(),
        number: z.string().optional(),
        box: z.string().optional(),
        zip: z.string().optional(),
        city: z.string().optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Payload invalide." });
    const { token, password, phone, address, street, number, box, zip, city } = parsed.data;

    const user = await getSupabaseUserByVerificationToken(token);
    if (!user || user.role !== "placeur") {
      return res.status(400).json({ error: "Invitation invalide ou expirée." });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const fullAddress =
      address ||
      [street, number, box ? `bte ${box}` : "", zip, city]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

    await updateSupabaseUser(user.id, {
      password: hashedPassword,
      phone: phone || null,
      address: fullAddress || null,
      street: street || null,
      number: number || null,
      box: box || null,
      zip: zip || null,
      city: city || null,
      email_verified: 1,
      profile_completed: 1,
      verification_token: null,
    });

    res.json({ success: true });
  });

  app.post("/api/auth/register", async (req, res) => {
    const {
      email,
      password,
      confirm_password,
      first_name,
      last_name,
      name,
      company_name,
      phone,
      street,
      number,
      box,
      zip,
      city,
      vat_number,
      ipi_number,
      is_vat_liable,
      accept_legal,
      role: requestedRole,
    } = req.body;
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
    if (accept_legal !== true) {
      return res.status(400).json({ error: "Vous devez accepter les mentions legales et la politique de confidentialite." });
    }
    if (isDisposableEmailDomain(normalizedEmail, env.blockedEmailDomains)) {
      return res.status(400).json({ error: "Les adresses email jetables ne sont pas autorisees." });
    }

    const role = requestedRole === "placeur" ? "placeur" : "syndic";
    const address = street && number && zip && city
      ? `${street} ${number}${box ? ` bte ${box}` : ""}, ${zip} ${city}`
      : null;

    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      const verificationToken = crypto.randomBytes(32).toString("hex");

      // 1. Create user (auth/identity only)
      const user = await createSupabaseUser({
        email: normalizedEmail,
        password: hashedPassword,
        first_name: first_name || null,
        last_name: last_name || null,
        name: name || null,
        phone: phone || null,
        role,
        profile_completed: role === "syndic" ? 1 : 0,
        email_verified: 0,
        verification_token: verificationToken,
      });

      // 2. Create company entity (syndic only)
      if (role === "syndic") {
        await createCompany({
          user_id: user.id,
          name: name || null,
          company_name: company_name || null,
          phone: phone || null,
          address,
          street: street || null,
          number: number || null,
          box: box || null,
          zip: zip || null,
          city: city || null,
          vat_number: vat_number || null,
          ipi_number: ipi_number || null,
          is_vat_liable: is_vat_liable != null ? Boolean(is_vat_liable) : true,
        });
      }

      if (role === "syndic") {
        await createSupabaseNotification({
          type: "contact",
          title: "Nouveau Syndic Inscrit",
          message: `Le syndic ${name} (${company_name || '-'}) s'est inscrit sur la plateforme. En attente de vérification email.`,
        });

        await createSupabaseNotification({
          user_id: user.id,
          type: "welcome",
          title: "Bienvenue chez Plachet !",
          message: `Bonjour ${name}, nous sommes ravis de vous compter parmi nos partenaires.

Voici comment débuter :
1. Ajoutez vos immeubles dans l'onglet "Immeubles".
2. Générez des liens de commande pour vos copropriétaires ou occupants.
3. Suivez l'état de vos commandes en temps réel.

Besoin d'aide ? Contactez-nous à info@plachet.be.`,
        });
      } else {
        // Placeur self-registration — admin needs to approve
        await createSupabaseNotification({
          type: "contact",
          title: "Nouvelle Demande Placeur",
          message: `Un nouveau placeur (${normalizedEmail}) a demandé un accès à la plateforme. Vérifiez et activez son compte dans la gestion des utilisateurs.`,
        });
      }

      const verificationUrl = `${resolveAppBaseUrl(req)}/api/auth/verify?token=${verificationToken}`;
      try {
        const emailSubject = role === "syndic"
          ? "Vérifiez votre adresse email - Plachet"
          : "Demande d'accès placeur reçue - Plachet";
        const emailBody = role === "syndic"
          ? `
            <p style="margin-top: 0;">Bonjour <strong>${name}</strong>,</p>
            <p>Merci de vous être inscrit. Veuillez cliquer sur le bouton ci-dessous pour vérifier votre adresse email et activer votre compte :</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="display: inline-block; padding: 14px 28px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Vérifier mon email</a>
            </div>
            <p style="margin-bottom: 0; font-size: 12px; color: #71717a; word-break: break-all;">Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br><br>${verificationUrl}</p>
            `
          : `
            <p style="margin-top: 0;">Bonjour,</p>
            <p>Nous avons bien reçu votre demande pour devenir placeur chez Plachet.</p>
            <p>Notre équipe examinera votre candidature et vous recevrez un email de confirmation une fois votre compte activé.</p>
            <p style="margin-bottom: 0; font-size: 14px; color: #71717a;">Pour toute question, contactez-nous à info@plachet.be.</p>
            `;
        await resend.emails.send({
          from: "Plachet <info@plachet.be>",
          to: normalizedEmail,
          subject: emailSubject,
          html: generateEmailTemplate(
            role === "syndic" ? "Bienvenue sur Plachet !" : "Demande reçue",
            emailBody,
          ),
        });
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
      }

      res.json({ success: true, message: role === "syndic" ? "Inscription réussie. Veuillez vérifier votre email." : "Demande envoyée." });
    } catch (e: any) {
      const message = String(e?.message || e);
      if (message.toLowerCase().includes("duplicate") || message.toLowerCase().includes("unique")) {
        return res.status(400).json({ error: "Cet email est déjà utilisé" });
      }
      res.status(500).json({ error: "Erreur lors de l'inscription" });
    }
  });

  app.get("/api/auth/verify", async (req, res) => {
    const token = String(req.query?.token || "").trim();
    const loginUrl = `${resolveAppBaseUrl(req)}/syndic/login`;
    if (!token) {
      return sendVerificationPage(res, {
        statusCode: 400,
        title: "Verification impossible - Plachet",
        heading: "Lien invalide",
        message: "Le lien de verification est incomplet. Demandez un nouvel email de verification depuis la page de connexion.",
        ctaHref: loginUrl,
      });
    }

    try {
      const user = await getSupabaseUserByVerificationToken(token);
      if (!user) {
        return sendVerificationPage(res, {
          statusCode: 400,
          title: "Lien invalide - Plachet",
          heading: "Lien invalide ou expire",
          message: "Ce lien de verification est invalide ou a deja ete utilise. Demandez un nouvel email depuis la page de connexion.",
          ctaHref: loginUrl,
        });
      }

      await markUserEmailVerified(user.id);
      return sendVerificationPage(res, {
        title: "Email verifie - Plachet",
        heading: "Email verifie",
        message: "Votre adresse email a ete verifiee avec succes. Vous pouvez maintenant vous connecter a votre espace.",
        ctaHref: loginUrl,
      });
    } catch (error) {
      console.error("Verification link error:", error);
      return sendVerificationPage(res, {
        statusCode: 500,
        title: "Erreur de verification - Plachet",
        heading: "Erreur technique",
        message: "Une erreur est survenue pendant la verification. Reessayez dans quelques minutes ou contactez le support.",
        ctaHref: loginUrl,
        accentColor: "#dc2626",
      });
    }
  });
}
