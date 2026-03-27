import type { Express } from "express";
import { pickDeps, type ServerRouteDeps } from "./route-deps";

export function registerSupabaseNotificationRoutes(app: Express, deps: ServerRouteDeps) {
  const {
    createSupabaseNotification,
    deleteSupabaseNotification,
    listNotifications: listSupabaseNotifications,
    markAllNotificationsRead: markAllSupabaseNotificationsRead,
    markNotificationRead: markSupabaseNotificationRead,
  } = pickDeps(deps);

  app.get("/api/notifications", async (req, res) => {
    const { userId, role } = req.query;
    res.json(await listSupabaseNotifications(String(role), userId ? Number(userId) : undefined));
  });

  app.post("/api/notifications/:id/read", async (req, res) => {
    await markSupabaseNotificationRead(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/notifications/read-all", async (req, res) => {
    const { userId, role } = req.query;
    await markAllSupabaseNotificationsRead(String(role), userId ? Number(userId) : undefined);
    res.json({ success: true });
  });

  app.delete("/api/notifications/:id", async (req, res) => {
    await deleteSupabaseNotification(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/contact", async (req, res) => {
    const name = String(req.body?.name || "").trim();
    const company = String(req.body?.company || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const message = String(req.body?.message || "").trim();
    const consent = req.body?.consent === true;

    if (!name || !email || !message) {
      return res.status(400).json({ error: "Informations de contact invalides." });
    }
    if (!consent) {
      return res.status(400).json({ error: "Consentement requis." });
    }

    await createSupabaseNotification({
      type: "contact",
      title: "Nouvelle Demande Contact",
      message: `Demande de ${name} (${company || "Particulier"}) - ${email}. Message: ${message.substring(0, 140)}...`,
    });
    res.json({ success: true });
  });
}
