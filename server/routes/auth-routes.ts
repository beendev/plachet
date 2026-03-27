import type { Express, Request } from "express";
import { pickDeps, type ServerRouteDeps } from "./route-deps";
import { getServerEnv } from "../env";
import { createSessionToken } from "../services/session-token";
import { isDisposableEmailDomain, normalizeEmail } from "../services/email-policy";
import { z } from "zod";

export function registerSupabaseAuthRoutes(app: Express, deps: ServerRouteDeps) {
  const {
    bcrypt,
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
    res.json({ user: sanitizeAuthUser(user), token });
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
      name,
      first_name,
      last_name,
      company_name,
      phone,
      street,
      number,
      box,
      zip,
      city,
      vat_number,
      bce_number,
      ipi_number,
      is_ipi_certified,
      accept_legal,
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
    const address = `${street} ${number}${box ? ` bte ${box}` : ""}, ${zip} ${city}`;

    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const user = await createSupabaseUser({
        email: normalizedEmail,
        password: hashedPassword,
        name,
        first_name: first_name || null,
        last_name: last_name || null,
        company_name,
        phone,
        address,
        street,
        number,
        box,
        zip,
        city,
        vat_number,
        bce_number: bce_number || null,
        ipi_number: ipi_number || null,
        is_ipi_certified: is_ipi_certified ? 1 : 0,
        role: "syndic",
        profile_completed: 1,
        email_verified: 0,
        verification_token: verificationToken,
      });

      await createSupabaseNotification({
        type: "contact",
        title: "Nouveau Syndic Inscrit",
        message: `Le syndic ${name} (${company_name}) s'est inscrit sur la plateforme. En attente de vérification email.`,
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

      const verificationUrl = `${resolveAppBaseUrl(req)}/api/auth/verify?token=${verificationToken}`;
      try {
        await resend.emails.send({
          from: "Plachet <info@plachet.be>",
          to: normalizedEmail,
          subject: "Vérifiez votre adresse email - Plachet",
          html: generateEmailTemplate(
            "Bienvenue sur Plachet !",
            `
            <p style="margin-top: 0;">Bonjour <strong>${name}</strong>,</p>
            <p>Merci de vous être inscrit. Veuillez cliquer sur le bouton ci-dessous pour vérifier votre adresse email et activer votre compte :</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="display: inline-block; padding: 14px 28px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Vérifier mon email</a>
            </div>
            <p style="margin-bottom: 0; font-size: 12px; color: #71717a; word-break: break-all;">Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br><br>${verificationUrl}</p>
            `,
          ),
        });
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
      }

      res.json({ success: true, message: "Inscription réussie. Veuillez vérifier votre email." });
    } catch (e: any) {
      const message = String(e?.message || e);
      if (message.toLowerCase().includes("duplicate") || message.toLowerCase().includes("unique")) {
        return res.status(400).json({ error: "Cet email est déjà utilisé" });
      }
      res.status(500).json({ error: "Erreur lors de l'inscription" });
    }
  });

  app.get("/api/auth/verify", async (req, res) => {
    const { token } = req.query;
    if (!token) {
      return res.status(400).send("Token manquant.");
    }

    const user = await getSupabaseUserByVerificationToken(String(token));
    if (!user) {
      return res.status(400).send("Lien de vérification invalide ou expiré.");
    }

    await updateSupabaseUser(user.id, { email_verified: 1, verification_token: null });

    res.send(`
      <html>
        <head>
          <title>Email Vérifié - Plachet</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f4f4f5; }
            .card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); text-align: center; max-width: 400px; width: 90%; }
            h1 { color: #10b981; margin-top: 0; }
            p { color: #52525b; line-height: 1.5; }
            a { display: inline-block; margin-top: 24px; padding: 12px 24px; background: #18181b; color: white; text-decoration: none; border-radius: 12px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Email Vérifié !</h1>
            <p>Votre adresse email a été vérifiée avec succès. Vous pouvez maintenant vous connecter à votre espace syndic.</p>
            <a href="/">Aller à la connexion</a>
          </div>
        </body>
      </html>
    `);
  });
}
