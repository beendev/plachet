import type { Express, Request } from "express";
import { pickDeps, type ServerRouteDeps } from "./route-deps";
import { getServerEnv } from "../env";

export function registerSupabaseOrderRoutes(app: Express, deps: ServerRouteDeps) {
  const {
    OWNER_APPROVAL_PENDING_STATUSES,
    assignSupabaseBuildingToUser,
    bcrypt,
    createOwnerApprovalToken,
    createSupabaseBuilding,
    createSupabaseNotification,
    createSupabaseOrder,
    createSupabaseOrderLink,
    consumeSupabaseOrderLink,
    createSupabaseSignage,
    createSupabaseUser,
    crypto,
    db,
    deleteSupabaseBuilding,
    deleteSupabaseNotification,
    deleteSupabaseSignage,
    deleteSupabaseUser,
    generateEmailTemplate,
    getSupabaseBuilding,
    getSupabaseBuildingWithSignage,
    getSupabaseOrder,
    getSupabaseOrderLink,
    getSupabaseUserBuildingByBuildingId,
    getSupabaseUserByEmail,
    getSupabaseUserById,
    getSupabaseUserByResetToken,
    getSupabaseUserByVerificationToken,
    isMissingFullAccessColumnError,
    listNotifications: listSupabaseNotifications,
    listOrders: listSupabaseOrders,
    listOrdersForExport: listSupabaseOrdersForExport,
    listOwnersForBuilding: listSupabaseOwnersForBuilding,
    listSignageForBuilding: listSupabaseSignageForBuilding,
    listBuildings: listSupabaseBuildings,
    listSyndicUsers: listSupabaseSyndicUsers,
    listTeamMembers: listSupabaseTeamMembers,
    markAllNotificationsRead: markAllSupabaseNotificationsRead,
    markNotificationRead: markSupabaseNotificationRead,
    normalizeSignagePayload,
    parseOrderDetailsPayload,
    queueSupabaseDelete,
    replaceUserBuildings: replaceSupabaseUserBuildings,
    resend,
    selectRowById,
    selectRowsByIds,
    serializeOrderDetailsPayload,
    setSupabaseSignageAfterPhoto,
    supabaseEmailExists,
    unlinkOwnerFromBuilding,
    upsertOwnerForOrganization,
    linkOwnerToBuilding,
    syncTableRowById,
    syncTableRows,
    updateBuilding: updateSupabaseBuilding,
    updateOrder: updateSupabaseOrder,
    updateOrderIfStatusIn: updateSupabaseOrderIfStatusIn,
    updateSignage: updateSupabaseSignage,
    updateUser: updateSupabaseUser,
    verifyOwnerApprovalToken,
    createBugReport,
    listBugReports,
    updateBugReport,
    deleteBugReport,
    getStats,
  } = pickDeps(deps);
    const isMissingOwnerReferenceColumnError = (error: any) => {
      const message = String(error?.message || error?.details || error || "").toLowerCase();
      return message.includes("owner_reference") && (message.includes("column") || message.includes("schema cache"));
    };
    const isMissingOrderSecurityColumnError = (error: any) => {
      const message = String(error?.message || error?.details || error || "").toLowerCase();
      const hasMissingColumnError = message.includes("column") || message.includes("schema cache");
      if (!hasMissingColumnError) return false;
      return ["order_link_token", "request_source", "request_ip_hash", "request_fingerprint", "dedup_hash"].some((column) =>
        message.includes(column)
      );
    };
    const toAscii = (value: unknown) =>
      String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\x20-\x7E]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    const escapePdfText = (value: string) =>
      value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    const wrapPdfLine = (text: string, maxChars = 96) => {
      const words = toAscii(text).split(" ").filter(Boolean);
      const lines: string[] = [];
      let current = "";
      for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length > maxChars) {
          if (current) lines.push(current);
          current = word;
        } else {
          current = candidate;
        }
      }
      if (current) lines.push(current);
      return lines.length ? lines : [""];
    };
    const escapeHtml = (value: unknown) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    const buildOrderItemsHtml = (rawDetails: unknown) => {
      const parsed = parseOrderDetailsPayload(rawDetails);
      if (!parsed.items.length) {
        return `<li>Aucune plaquette detaillee.</li>`;
      }
      return parsed.items
        .map((item: any) => {
          const category = escapeHtml(item?.category || "Plaquette");
          const textLines = Array.isArray(item?.text_lines)
            ? item.text_lines.map((line: unknown) => String(line || "").trim()).filter(Boolean)
            : [];
          const label = escapeHtml(textLines.length ? textLines.join(" / ") : item?.name || "Texte non renseigne");
          const quantity = Number(item?.quantity || 1);
          return `<li><strong>${category}</strong> - ${label} (Qté: ${quantity})</li>`;
        })
        .join("");
    };
    const getAuthUser = (req: any) => {
      const auth = (req as any).authUser;
      if (auth?.userId && auth?.role) return { userId: Number(auth.userId), role: String(auth.role) };
      // Fallback: middleware injects userId/role into query in dev mode
      const qUserId = req.query?.userId ? Number(req.query.userId) : null;
      const qRole = req.query?.role ? String(req.query.role) : null;
      const bUserId = req.body?.userId ? Number(req.body.userId) : null;
      const bRole = req.body?.role ? String(req.body.role) : null;
      const userId = qUserId || bUserId;
      const role = qRole || bRole;
      if (userId && role) return { userId, role };
      return null;
    };
    const resolveAppBaseUrl = (req: Request) => {
      const env = getServerEnv();
      if (env.appUrl) return env.appUrl.replace(/\/$/, "");
      const origin = String(req.headers.origin || "").trim();
      if (origin) return origin.replace(/\/$/, "");
      return `${req.protocol}://${req.get("host")}`;
    };
    const normalizeRequesterQuality = (value: unknown) => {
      const normalized = String(value || "").trim().toLowerCase();
      if (["locataire", "tenant"].includes(normalized)) return "tenant";
      if (["proprietaire", "owner"].includes(normalized)) return "owner";
      if (["syndic"].includes(normalized)) return "syndic";
      if (["admin"].includes(normalized)) return "admin";
      return normalized || "tenant";
    };
    const ORDER_STATUS_ALIASES = new Map<string, string>([
      ["validation_proprietaire", "validation_proprietaire"],
      ["en_attente_validation_proprietaire", "validation_proprietaire"],
      ["reçue", "reçue"],
      ["recue", "reçue"],
      ["en_traitement", "en_traitement"],
      ["en_cours", "en_traitement"],
      ["in_production", "in_production"],
      ["expédiée", "expédiée"],
      ["expediee", "expédiée"],
      ["livrée", "livrée"],
      ["livree", "livrée"],
      ["en_pose", "en_pose"],
      ["posée", "posée"],
      ["posee", "posée"],
      ["facturée", "facturée"],
      ["facturee", "facturée"],
      ["annulée", "annulée"],
      ["annulee", "annulée"],
    ]);
    const normalizeOrderStatus = (value: unknown, fallback = "reçue") => {
      const normalized = String(value || "").trim().toLowerCase();
      return ORDER_STATUS_ALIASES.get(normalized) || fallback;
    };
    const ORDER_STATUS_TRANSITIONS: Record<string, Set<string>> = {
      validation_proprietaire: new Set(["reçue", "annulée"]),
      reçue: new Set(["en_traitement", "in_production", "en_pose", "annulée"]),
      en_traitement: new Set(["in_production", "en_pose", "annulée"]),
      in_production: new Set(["expédiée", "en_pose", "annulée"]),
      expédiée: new Set(["livrée", "annulée"]),
      livrée: new Set(["en_pose", "posée", "annulée"]),
      en_pose: new Set(["posée", "annulée"]),
      posée: new Set(["facturée"]),
      annulée: new Set(),
    };
    const canTransitionOrderStatus = (currentStatus: unknown, nextStatus: unknown) => {
      const current = normalizeOrderStatus(currentStatus);
      const next = normalizeOrderStatus(nextStatus);
      if (current === next) return true;
      return ORDER_STATUS_TRANSITIONS[current]?.has(next) || false;
    };
    const createSecureToken = (size = 24) => crypto.randomBytes(size).toString("base64url");
    const buildOrderNumber = () => {
      const year = new Date().getFullYear();
      const randomPart = createSecureToken(5).replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 8) || "ORDER";
      return `CMD-${year}-${randomPart}`;
    };
    const getClientIp = (req: Request) => {
      const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
      const ip = forwarded || req.ip || req.socket.remoteAddress || "";
      return ip;
    };
    const hashWithAppSecret = (value: string) => {
      const env = getServerEnv();
      const secret = env.sessionSecret || env.supabaseServiceRoleKey || "plachet";
      return crypto.createHash("sha256").update(`${secret}:${value}`).digest("hex");
    };
    const buildOrderRequestHash = (req: Request) => {
      const ip = getClientIp(req);
      if (!ip) return null;
      return hashWithAppSecret(ip);
    };
    const buildOrderFingerprint = (req: Request) => {
      const ip = getClientIp(req);
      const ua = String(req.headers["user-agent"] || "").trim();
      if (!ip && !ua) return null;
      return hashWithAppSecret(`${ip}|${ua}`);
    };
    const buildOrderDedupHash = (payload: {
      buildingId?: number | string | null;
      requesterEmail?: string | null;
      lotNumber?: string | null;
      nameToReplace?: string | null;
      ownerEmail?: string | null;
    }) => {
      const bucket = Math.floor(Date.now() / (10 * 60 * 1000));
      const key = [
        String(payload.buildingId || ""),
        String(payload.requesterEmail || "").trim().toLowerCase(),
        String(payload.lotNumber || "").trim().toLowerCase(),
        String(payload.nameToReplace || "").trim().toLowerCase(),
        String(payload.ownerEmail || "").trim().toLowerCase(),
        String(bucket),
      ].join("|");
      return hashWithAppSecret(key);
    };
    const isOrderUniqueViolation = (error: any) => {
      const message = String(error?.message || error?.details || error || "").toLowerCase();
      return message.includes("duplicate key") && message.includes("dedup_hash");
    };
    const buildOrderLinkExpiresAt = (hours = 72) => {
      const duration = Math.max(1, Number(hours || 72));
      return new Date(Date.now() + duration * 60 * 60 * 1000).toISOString();
    };
    const formatOrderDetailsText = (order: any) => {
      let formatted = String(order.details || "");
      try {
        const parsed = parseOrderDetailsPayload(order.details);
        if (parsed.items.length > 0) {
          formatted = parsed.items
            .map((item: any) => {
              const category = toAscii(item.category || "Plaquette");
              const lines = Array.isArray(item.text_lines)
                ? item.text_lines.map((line: unknown) => toAscii(line)).filter(Boolean)
                : [];
              const name = toAscii(lines.length > 0 ? lines.join(" / ") : item.name || "Texte non renseigne");
              const quantity = Number(item.quantity || 1);
              return `${category}: ${name} (quantite ${quantity})`;
            })
            .join(" ; ");
        }
      } catch (_e) {}
      return formatted;
    };
    const getStatusLabelForClient = (status: unknown) => {
      const value = String(status || "");
      if (OWNER_APPROVAL_PENDING_STATUSES.has(value)) return "En attente de validation proprietaire";
      if (value === "reçue") return "Recue par Plachet";
      if (value === "en_traitement" || value === "en_cours") return "En preparation";
      if (value === "en_pose") return "Intervention planifiee";
      if (value === "posée") return "Terminee";
      if (value === "annulée") return "Annulee";
      return value || "En cours";
    };
    const buildPdfBuffer = (
      orders: any[],
      context: {
        issuerName?: string;
        issuerCompany?: string;
        issuerEmail?: string;
        issuerPhone?: string;
      } = {}
    ) => {
      const total = orders.length;
      const awaitingOwner = orders.filter((o: any) => OWNER_APPROVAL_PENDING_STATUSES.has(String(o.status || ""))).length;
      const installed = orders.filter((o: any) => String(o.status || "") === "posée").length;
      const cancelled = orders.filter((o: any) => String(o.status || "") === "annulée").length;
      const inProgress = orders.filter((o: any) => {
        const status = String(o.status || "");
        return !OWNER_APPROVAL_PENDING_STATUSES.has(status) && status !== "posée" && status !== "annulée";
      }).length;

      const lines: string[] = [
        "RAPPORT COMMANDES PLACHET",
        `Genere le ${new Date().toLocaleString("fr-BE")}`,
        context.issuerCompany ? `Syndic: ${toAscii(context.issuerCompany)}` : "",
        context.issuerName ? `Contact: ${toAscii(context.issuerName)}` : "",
        context.issuerEmail ? `Email: ${toAscii(context.issuerEmail)}` : "",
        context.issuerPhone ? `Telephone: ${toAscii(context.issuerPhone)}` : "",
        "",
        `Total commandes: ${total}`,
        `En attente validation proprietaire: ${awaitingOwner}`,
        `En cours de traitement: ${inProgress}`,
        `Terminees (posees): ${installed}`,
        `Annulees: ${cancelled}`,
        "",
        "DETAIL DES COMMANDES",
        "--------------------------------------------------------------------------------",
      ];

      orders.forEach((order: any, index: number) => {
        const details = formatOrderDetailsText(order);
        const createdDate = order.created_at ? new Date(order.created_at).toLocaleDateString("fr-BE") : "-";
        lines.push(`#${index + 1} | ${toAscii(order.order_number || `CMD-${order.id || "-"}`)}`);
        lines.push(`Immeuble: ${toAscii(order.building_name || order.building || "-")}`);
        lines.push(`Contact: ${toAscii(order.requester_name || "-")} (${toAscii(order.requester_email || "-")})`);
        lines.push(`Lot/Appartement: ${toAscii(order.lot_number || "-")} | Statut: ${getStatusLabelForClient(order.status)} | Date: ${toAscii(createdDate)}`);
        lines.push(`Nom a afficher: ${toAscii(order.name_to_replace || "-")}`);
        wrapPdfLine(`Plaquettes demandees: ${details}`).forEach((line) => lines.push(line));
        lines.push("--------------------------------------------------------------------------------");
      });

      lines.push("");
      lines.push("Validation client");
      lines.push("Nom:");
      lines.push("Date:");
      lines.push("Signature:");
      lines.push("");
      lines.push("Merci pour votre confiance.");

      const linesPerPage = 48;
      const pages: string[][] = [];
      for (let i = 0; i < lines.length; i += linesPerPage) {
        pages.push(lines.slice(i, i + linesPerPage));
      }
      if (pages.length === 0) pages.push(["Aucune commande a afficher."]);

      const objects: string[] = [];
      objects.push("<< /Type /Catalog /Pages 2 0 R >>");
      objects.push("<< /Type /Pages /Kids [] /Count 0 >>");
      objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

      const pageObjectIds: number[] = [];
      for (const pageLines of pages) {
        const pageObjectId = objects.length + 1;
        const contentObjectId = objects.length + 2;
        pageObjectIds.push(pageObjectId);

        const textLines: string[] = [];
        pageLines.forEach((line, idx) => {
          if (idx > 0) textLines.push("T*");
          textLines.push(`(${escapePdfText(toAscii(line))}) Tj`);
        });
        const stream = ["BT", "/F1 10 Tf", "50 800 Td", "14 TL", ...textLines, "ET"].join("\n");

        objects.push(
          `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`
        );
        objects.push(`<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`);
      }

      objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;

      let pdf = "%PDF-1.4\n";
      const offsets: number[] = [0];
      objects.forEach((obj, idx) => {
        offsets.push(Buffer.byteLength(pdf, "utf8"));
        pdf += `${idx + 1} 0 obj\n${obj}\nendobj\n`;
      });

      const xrefOffset = Buffer.byteLength(pdf, "utf8");
      pdf += `xref\n0 ${objects.length + 1}\n`;
      pdf += "0000000000 65535 f \n";
      for (let i = 1; i < offsets.length; i++) {
        pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
      }
      pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
      return Buffer.from(pdf, "utf8");
    };
    app.post("/api/orders", async (req, res) => {
      const {
        building_id,
        signage_id,
        requester_name,
        requester_email,
        requester_quality,
        lot_number,
        name_to_replace,
        details,
        isAdminAction,
        owner_email,
        owner_name,
        owner_reference,
        order_link_token,
        request_source,
      } = req.body;
      const auth = getAuthUser(req);
      const isAdminActionByAdmin = Boolean(isAdminAction) && auth?.role === "admin";
      const buildingId = Number(building_id);
      if (!Number.isFinite(buildingId) || buildingId <= 0) {
        return res.status(400).json({ error: "Immeuble invalide." });
      }

      const normalizedRequesterQuality = normalizeRequesterQuality(requester_quality);
      if (normalizedRequesterQuality === "tenant" && !String(owner_email || "").trim()) {
        return res.status(400).json({ error: "Email proprietaire requis pour une demande locataire." });
      }

      if (auth && !["admin", "syndic"].includes(auth.role)) {
        return res.status(403).json({ error: "Role non autorise pour creer une commande." });
      }
      if (auth && auth.role !== "admin") {
        const allowedBuildings = await listSupabaseBuildings(auth.role, auth.userId);
        const hasAccess = allowedBuildings.some((b: any) => Number(b.id) === buildingId);
        if (!hasAccess) return res.status(403).json({ error: "Acces refuse a cet immeuble." });
      }

      const isPublicOrderRequest = !auth;
      const orderLinkToken = String(order_link_token || "").trim();
      let validatedOrderLink: any = null;

      if (orderLinkToken) {
        validatedOrderLink = await getSupabaseOrderLink(orderLinkToken);
        if (!validatedOrderLink || Number(validatedOrderLink.building_id) !== buildingId) {
          return res.status(403).json({ error: "Lien de commande invalide." });
        }
      }

      if (isPublicOrderRequest && !validatedOrderLink) {
        return res.status(400).json({ error: "Lien de commande requis." });
      }

      const order_number = buildOrderNumber();
      const status = normalizedRequesterQuality === "tenant" ? "validation_proprietaire" : "reçue";
      const requestIpHash = buildOrderRequestHash(req);
      const requestFingerprint = buildOrderFingerprint(req);
      const normalizedRequestSource = String(request_source || "").trim() || (isPublicOrderRequest ? "public_link" : "portal");
      const dedupHash = buildOrderDedupHash({
        buildingId,
        requesterEmail: requester_email || null,
        lotNumber: lot_number || null,
        nameToReplace: name_to_replace || null,
        ownerEmail: owner_email || null,
      });
      const serializedDetails = serializeOrderDetailsPayload(
        details,
        owner_name || owner_email || owner_reference
          ? { owner_name: owner_name || null, owner_email: owner_email || null, owner_reference: owner_reference || null }
          : {}
      );

      try {
        let order: any = null;
        const orderPayload: Record<string, any> = {
          building_id: buildingId,
          signage_id: signage_id || null,
          requester_name: requester_name || null,
          requester_email: requester_email || null,
          requester_quality: normalizedRequesterQuality,
          lot_number: lot_number || null,
          name_to_replace: name_to_replace || null,
          details: serializedDetails,
          order_number,
          owner_email: owner_email || null,
          owner_reference: owner_reference || null,
          order_link_token: orderLinkToken || null,
          request_source: normalizedRequestSource,
          request_ip_hash: requestIpHash,
          request_fingerprint: requestFingerprint,
          dedup_hash: dedupHash,
          status,
        };

        try {
          order = await createSupabaseOrder(orderPayload);
        } catch (createError: any) {
          if (isOrderUniqueViolation(createError)) {
            return res.status(409).json({ error: "Commande deja enregistree recemment. Merci de patienter." });
          }

          if (!isMissingOwnerReferenceColumnError(createError) && !isMissingOrderSecurityColumnError(createError)) {
            throw createError;
          }

          const fallbackPayload = { ...orderPayload };
          if (isMissingOwnerReferenceColumnError(createError)) {
            delete fallbackPayload.owner_reference;
          }
          if (isMissingOrderSecurityColumnError(createError)) {
            delete fallbackPayload.order_link_token;
            delete fallbackPayload.request_source;
            delete fallbackPayload.request_ip_hash;
            delete fallbackPayload.request_fingerprint;
            delete fallbackPayload.dedup_hash;
          }

          try {
            order = await createSupabaseOrder(fallbackPayload);
          } catch (retryError: any) {
            if (isOrderUniqueViolation(retryError)) {
              return res.status(409).json({ error: "Commande deja enregistree recemment. Merci de patienter." });
            }
            throw retryError;
          }
        }

        if (orderLinkToken) {
          try {
            await consumeSupabaseOrderLink(orderLinkToken, buildingId);
          } catch (consumeError) {
            console.error("Failed to consume order link token:", consumeError);
          }
        }

        const building = await getSupabaseBuilding(buildingId);
        const userBuilding = await getSupabaseUserBuildingByBuildingId(buildingId);

        await createSupabaseNotification({
          type: "order",
          title: "Nouvelle Commande",
          message: `${normalizedRequesterQuality === "tenant" ? "Demande" : "Commande"} reçue de ${requester_name} pour l'immeuble ${building?.name || "Inconnu"}`,
        });

        try {
          await resend.emails.send({
            from: "Plachet <info@plachet.be>",
            to: "info@plachet.be",
            subject: `${normalizedRequesterQuality === "tenant" ? "Nouvelle demande" : "Nouvelle commande"}: ${building?.name || "Inconnu"} - ${order_number}`,
            html: generateEmailTemplate(
              normalizedRequesterQuality === "tenant" ? "Nouvelle demande reçue" : "Nouvelle commande reçue",
              `<p>Une ${normalizedRequesterQuality === "tenant" ? "demande locataire" : "commande"} a été reçue pour l'immeuble <strong>${building?.name || "Inconnu"}</strong>.</p>`
            ),
          });
        } catch (error) {
          console.error("Failed to send admin order notification email:", error);
        }

        if (requester_email) {
          try {
            const appBaseUrl = resolveAppBaseUrl(req);
            const accountLink = `${appBaseUrl}/syndic`;
            const orderInfoHtml = `
              <div style="margin: 20px 0; padding: 16px; border: 1px solid #e4e4e7; border-radius: 12px; background: #fafafa;">
                <p style="margin: 0 0 8px 0;"><strong>Numero:</strong> ${escapeHtml(order_number)}</p>
                <p style="margin: 0 0 8px 0;"><strong>Immeuble:</strong> ${escapeHtml(building?.name || "Inconnu")}</p>
                <p style="margin: 0 0 8px 0;"><strong>Lot/Appartement:</strong> ${escapeHtml(lot_number || "Non renseigne")}</p>
                <p style="margin: 0 0 8px 0;"><strong>Demandeur:</strong> ${escapeHtml(requester_name || "Non renseigne")} (${escapeHtml(requester_email)})</p>
                <p style="margin: 0;"><strong>Statut:</strong> ${normalizedRequesterQuality === "tenant" ? "En attente de validation proprietaire" : "Commande recue par Plachet"}</p>
              </div>
              <p style="margin: 0 0 8px 0;"><strong>Plaquettes commandees:</strong></p>
              <ul style="margin-top: 0; padding-left: 18px;">${buildOrderItemsHtml(serializedDetails)}</ul>
              <p style="margin: 20px 0 10px 0;">
                <a href="${accountLink}" style="display:inline-block;padding:12px 20px;background:#000;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Acceder a mon compte</a>
              </p>
              <p style="margin: 0; font-size: 14px; color: #71717a;">Lien direct: ${escapeHtml(accountLink)}</p>
            `;
            await resend.emails.send({
              from: "Plachet <info@plachet.be>",
              to: requester_email,
              subject: normalizedRequesterQuality === "tenant"
                ? `Votre demande Plachet est en attente de validation - ${order_number}`
                : `Confirmation de votre commande Plachet - ${order_number}`,
              html: generateEmailTemplate(
                normalizedRequesterQuality === "tenant" ? "Demande envoyée" : "Confirmation de commande",
                normalizedRequesterQuality === "tenant"
                  ? `<p style="margin-top: 0;">Bonjour <strong>${escapeHtml(requester_name)}</strong>,</p><p>Votre demande pour l'immeuble <strong>${escapeHtml(building?.name || "")}</strong> a bien été transmise.</p><p>Elle doit maintenant être validée par le propriétaire avant d'être traitée par Plachet.</p>${orderInfoHtml}`
                  : `<p style="margin-top: 0;">Bonjour <strong>${escapeHtml(requester_name)}</strong>,</p><p>Nous avons bien reçu votre commande de plaquette pour l'immeuble <strong>${escapeHtml(building?.name || "")}</strong>.</p>${orderInfoHtml}`
              ),
            });
          } catch (error) {
            console.error("Failed to send requester confirmation email:", error);
          }
        }

        if (normalizedRequesterQuality === "tenant" && owner_email) {
          const approvalToken = createOwnerApprovalToken(order.id, owner_email);
          const approvalBaseUrl = resolveAppBaseUrl(req);
          const approvalLink = `${approvalBaseUrl}/validation-proprietaire?token=${approvalToken}`;

          try {
            await resend.emails.send({
              from: "Plachet <info@plachet.be>",
              to: owner_email,
              subject: `Validation requise pour une demande de plaquette - ${building?.name || "Plachet"}`,
              html: generateEmailTemplate(
                "Validation propriétaire requise",
                `<p style="margin-top: 0;">Bonjour <strong>${owner_name || "Propriétaire"}</strong>,</p><p>Un locataire a introduit une demande de plaquette pour l'immeuble <strong>${building?.name || ""}</strong>.</p><p>Nom demandé : <strong>${requester_name || "Non renseigné"}</strong></p><p>Lot / appartement : <strong>${lot_number || "Non renseigné"}</strong></p><p>Vous pouvez valider ou refuser cette demande via le lien ci-dessous :</p><p><a href="${approvalLink}" style="display:inline-block;padding:14px 24px;background:#000;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Ouvrir la demande</a></p><p style="font-size:14px;color:#71717a;">Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br>${approvalLink}</p>`
              ),
            });
          } catch (error) {
            console.error("Failed to send owner approval email:", error);
          }
        }

        if (isAdminActionByAdmin && userBuilding) {
          const syndicUser = await getSupabaseUserById(userBuilding.user_id);
          await createSupabaseNotification({
            user_id: userBuilding.user_id,
            type: "order",
            title: "Confirmation de prise en charge",
            message: `Une commande a été encodée pour l'immeuble ${building?.name}. Si vous n'êtes pas à l'origine de cette demande, veuillez annuler la commande immédiatement, sans quoi elle sera facturée.`,
          });

          if (syndicUser?.email) {
            try {
              const appBaseUrl = resolveAppBaseUrl(req);
              const accountLink = `${appBaseUrl}/syndic`;
              const orderInfoHtml = `
                <div style="margin: 20px 0; padding: 16px; border: 1px solid #e4e4e7; border-radius: 12px; background: #fafafa;">
                  <p style="margin: 0 0 8px 0;"><strong>Numero:</strong> ${escapeHtml(order_number)}</p>
                  <p style="margin: 0 0 8px 0;"><strong>Immeuble:</strong> ${escapeHtml(building?.name || "Inconnu")}</p>
                  <p style="margin: 0 0 8px 0;"><strong>Lot/Appartement:</strong> ${escapeHtml(lot_number || "Non renseigne")}</p>
                  <p style="margin: 0;"><strong>Plaquettes:</strong></p>
                  <ul style="margin-top: 8px; padding-left: 18px;">${buildOrderItemsHtml(serializedDetails)}</ul>
                </div>
                <p style="margin: 20px 0 10px 0;">
                  <a href="${accountLink}" style="display:inline-block;padding:12px 20px;background:#000;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Acceder a mon compte</a>
                </p>
                <p style="margin: 0; font-size: 14px; color: #71717a;">Lien direct: ${escapeHtml(accountLink)}</p>
              `;
              await resend.emails.send({
                from: "Plachet <info@plachet.be>",
                to: syndicUser.email,
                subject: `Nouvelle commande encodée pour ${building?.name}`,
                html: generateEmailTemplate(
                  "Nouvelle commande encodée",
                  `<p style="margin-top: 0;">Bonjour <strong>${escapeHtml(syndicUser.name || "Syndic")}</strong>,</p><p>Une commande a été encodée par nos services pour votre immeuble <strong>${escapeHtml(building?.name)}</strong>.</p>${orderInfoHtml}`
                ),
              });
            } catch (error) {
              console.error("Failed to send syndic notification email:", error);
            }
          }
        }

        res.json({ id: order.id });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get("/api/orders/owner-approval", async (req, res) => {
      try {
        const token = String(req.query.token || "");
        const payload = verifyOwnerApprovalToken(token);
        const order: any = await getSupabaseOrder(payload.orderId);

        if (!order || !order.owner_email || order.owner_email.toLowerCase() !== payload.ownerEmail) {
          return res.status(404).json({ error: "Demande introuvable" });
        }

        return res.json({
          ...order,
          alreadyProcessed: !OWNER_APPROVAL_PENDING_STATUSES.has(order.status),
        });
      } catch (error: any) {
        return res.status(400).json({ error: error.message || "Lien invalide" });
      }
    });

    app.post("/api/orders/owner-approval", async (req, res) => {
      try {
        const { token, decision } = req.body;
        const payload = verifyOwnerApprovalToken(String(token || ""));
        const order: any = await getSupabaseOrder(payload.orderId);

        if (!order || !order.owner_email || order.owner_email.toLowerCase() !== payload.ownerEmail) {
          return res.status(404).json({ error: "Demande introuvable" });
        }

        if (!["approve", "reject"].includes(String(decision || ""))) {
          return res.status(400).json({ error: "Decision invalide." });
        }

        const nextStatus = decision === "approve" ? "reçue" : "annulée";
        const ownerDecisionPayload =
          decision === "approve"
            ? { status: nextStatus, owner_approved_at: new Date().toISOString(), owner_rejected_at: null }
            : { status: nextStatus, owner_rejected_at: new Date().toISOString(), owner_approved_at: null };
        const updatedOrder = await updateSupabaseOrderIfStatusIn(
          payload.orderId,
          ownerDecisionPayload,
          Array.from(OWNER_APPROVAL_PENDING_STATUSES),
        );

        if (!updatedOrder) {
          const latestOrder = await getSupabaseOrder(payload.orderId);
          return res.json({ ...(latestOrder || order), alreadyProcessed: true });
        }

        if (order.requester_email) {
          try {
            await resend.emails.send({
              from: "Plachet <info@plachet.be>",
              to: order.requester_email,
              subject: decision === "approve"
                ? `Votre demande Plachet a été validée - ${order.order_number}`
                : `Votre demande Plachet a été refusée - ${order.order_number}`,
              html: generateEmailTemplate(
                decision === "approve" ? "Demande validée" : "Demande refusée",
                decision === "approve"
                  ? `<p style="margin-top: 0;">Bonjour <strong>${order.requester_name}</strong>,</p><p>Le propriétaire a validé votre demande pour l'immeuble <strong>${order.building_name}</strong>.</p><p>Plachet peut désormais la traiter.</p>`
                  : `<p style="margin-top: 0;">Bonjour <strong>${order.requester_name}</strong>,</p><p>Le propriétaire a refusé votre demande pour l'immeuble <strong>${order.building_name}</strong>.</p>`
              ),
            });
          } catch (error) {
            console.error("Failed to send requester owner-decision email:", error);
          }
        }

        const userBuilding = await getSupabaseUserBuildingByBuildingId(order.building_id);
        if (userBuilding?.user_id) {
          const syndicUser = await getSupabaseUserById(userBuilding.user_id);
          const buildingLabel = order.building_name || `ACP #${order.building_id}`;
          await createSupabaseNotification({
            user_id: userBuilding.user_id,
            type: "order_owner_validation",
            title: decision === "approve" ? "Demande propriétaire validée" : "Demande propriétaire refusée",
            message:
              decision === "approve"
                ? `Le proprietaire a valide la demande ${order.order_number || `#${order.id}`} pour ${buildingLabel}.`
                : `Le proprietaire a refuse la demande ${order.order_number || `#${order.id}`} pour ${buildingLabel}.`,
          });

          if (syndicUser?.email) {
            try {
              const appBaseUrl = resolveAppBaseUrl(req);
              const accountLink = `${appBaseUrl}/syndic`;
              await resend.emails.send({
                from: "Plachet <info@plachet.be>",
                to: syndicUser.email,
                subject:
                  decision === "approve"
                    ? `Validation proprietaire recue - ${order.order_number}`
                    : `Demande refusee par le proprietaire - ${order.order_number}`,
                html: generateEmailTemplate(
                  decision === "approve" ? "Validation proprietaire recue" : "Demande refusee",
                  decision === "approve"
                    ? `<p style="margin-top:0;">Le proprietaire a valide la demande pour l'immeuble <strong>${escapeHtml(buildingLabel)}</strong>.</p><p>Vous pouvez suivre la commande dans votre espace syndic.</p><p><a href="${accountLink}">Acceder au portail syndic</a></p>`
                    : `<p style="margin-top:0;">Le proprietaire a refuse la demande pour l'immeuble <strong>${escapeHtml(buildingLabel)}</strong>.</p><p>Vous pouvez consulter le detail dans votre espace syndic.</p><p><a href="${accountLink}">Acceder au portail syndic</a></p>`
                ),
              });
            } catch (error) {
              console.error("Failed to send syndic owner-decision email:", error);
            }
          }
        }

        return res.json({ ...order, ...updatedOrder, status: nextStatus, alreadyProcessed: true });
      } catch (error: any) {
        return res.status(400).json({ error: error.message || "Lien invalide" });
      }
    });

    app.get("/api/orders", async (req, res) => {
      const auth = getAuthUser(req);
      if (!auth) return res.status(401).json({ error: "Authentification requise." });
      const orders = await listSupabaseOrders(auth.role, auth.userId);
      res.json(orders);
    });

    app.patch("/api/orders/:id/status", async (req, res) => {
      const { status, role, userId } = req.body;
      const auth = getAuthUser(req);
      const actingRole = String(auth?.role || role || "").trim();
      const actingUserId = Number(auth?.userId || userId);
      const nextStatus = normalizeOrderStatus(status, "");
      if (!nextStatus) {
        return res.status(400).json({ error: "Statut invalide." });
      }

      if (!["admin", "syndic", "placeur"].includes(actingRole)) {
        return res.status(403).json({ error: "Role invalide." });
      }
      if (actingRole !== "admin" && !Number.isFinite(actingUserId)) {
        return res.status(400).json({ error: "Utilisateur invalide." });
      }

      const order: any = await getSupabaseOrder(req.params.id);
      if (!order) return res.status(404).json({ error: "Commande introuvable." });

      if (actingRole !== "admin") {
        const allowedBuildings = await listSupabaseBuildings(actingRole, actingUserId);
        const hasAccess = allowedBuildings.some((b: any) => Number(b.id) === Number(order.building_id));
        if (!hasAccess) return res.status(403).json({ error: "Acces refuse." });
      }

      if (!canTransitionOrderStatus(order.status, nextStatus)) {
        return res.status(409).json({
          error: `Transition de statut invalide (${normalizeOrderStatus(order.status)} -> ${nextStatus}).`,
        });
      }

      await updateSupabaseOrder(req.params.id, { status: nextStatus });
      const refreshedOrder: any = await getSupabaseOrder(req.params.id);

      if (refreshedOrder && refreshedOrder.requester_email) {
        let statusText = nextStatus;
        let message = "";

        switch (nextStatus) {
          case "en_traitement":
            statusText = "En cours de fabrication";
            message = "Votre plaquette est actuellement en cours de fabrication dans nos ateliers.";
            break;
          case "in_production":
            statusText = "Production en cours";
            message = "Votre plaquette est en production.";
            break;
          case "expédiée":
            statusText = "Expédiée";
            message = "Votre plaquette a été expédiée et devrait arriver très prochainement.";
            break;
          case "livrée":
            statusText = "Livrée";
            message = "Votre plaquette a été livrée. Si l'installation est incluse, elle sera posée sous peu.";
            break;
          case "posée":
            statusText = "Posée";
            message = "Votre plaquette a été installée avec succès.";
            break;
          case "annulée":
            statusText = "Annulée";
            message = "Votre commande a été annulée.";
            break;
        }

        if (message) {
          try {
            await resend.emails.send({
              from: "Plachet <info@plachet.be>",
              to: refreshedOrder.requester_email,
              subject: `Mise à jour de votre commande Plachet - ${refreshedOrder.order_number}`,
              html: generateEmailTemplate("Mise à jour de votre commande", `<p style="margin-top: 0;">Bonjour <strong>${refreshedOrder.requester_name}</strong>,</p><p>Le statut de votre commande pour l'immeuble <strong>${refreshedOrder.building_name}</strong> a été mis à jour.</p><p><strong>${statusText}</strong></p><p>${message}</p>`),
            });
          } catch (error) {
            console.error("Failed to send status update email:", error);
          }
        }
      }

      res.json({ success: true });
    });

    app.post("/api/orders/:id/photo", async (req, res) => {
      const { type, image, role, userId, geo } = req.body;
      const auth = getAuthUser(req);
      const actingRole = role || auth?.role || "";
      const actingUserId = userId || auth?.userId;

      if (!["admin", "syndic", "placeur"].includes(actingRole)) {
        return res.status(403).json({ error: "Role invalide." });
      }

      if (!type || !image || typeof image !== "string") {
        return res.status(400).json({ error: "Payload photo invalide." });
      }
      const MAX_SIZE_BYTES = 6 * 1024 * 1024; // 6MB
      if (image.length * 0.75 > MAX_SIZE_BYTES) {
        return res.status(413).json({ error: "Image trop volumineuse (max 6MB)." });
      }
      if (!image.startsWith("data:image/")) {
        return res.status(400).json({ error: "Format d'image invalide." });
      }

      const order = await getSupabaseOrder(req.params.id);
      if (!order) return res.status(404).json({ error: "Commande introuvable" });

      if (actingRole !== "admin") {
        const allowedBuildings = await listSupabaseBuildings(actingRole || "syndic", Number(actingUserId));
        const hasAccess = allowedBuildings.some((b: any) => Number(b.id) === Number(order.building_id));
        if (!hasAccess) return res.status(403).json({ error: "Acces refuse." });
      }

      const column = type === "before" ? "photo_before" : "photo_after";
      const geoColumn = type === "before" ? "photo_before_geo" : "photo_after_geo";
      const updatePayload: Record<string, any> = { [column]: image };
      // Save geolocation data if provided
      if (geo && typeof geo === "object" && typeof geo.lat === "number" && typeof geo.lng === "number") {
        updatePayload[geoColumn] = { lat: geo.lat, lng: geo.lng, accuracy: geo.accuracy ?? null };
      }
      // Track which placeur is doing the installation
      if (actingRole === "placeur" && actingUserId && !order.placeur_id) {
        updatePayload.placeur_id = Number(actingUserId);
      }
      await updateSupabaseOrder(req.params.id, updatePayload);
      const refreshed: any = await getSupabaseOrder(req.params.id);
      if (refreshed?.photo_before && refreshed?.photo_after && refreshed.status === "en_pose") {
        await updateSupabaseOrder(req.params.id, { status: "posée" });

        // Notify syndic that installation is complete
        try {
          const building = await getSupabaseBuilding(refreshed.building_id);
          const buildingName = building?.name || `Immeuble #${refreshed.building_id}`;
          const userBuilding = await getSupabaseUserBuildingByBuildingId(refreshed.building_id);
          if (userBuilding?.user_id) {
            await createSupabaseNotification({
              user_id: userBuilding.user_id,
              type: "order",
              title: "Plaques installees",
              message: `La pose pour la commande ${refreshed.order_number || `#${refreshed.id}`} (${buildingName}) est terminee. Les photos avant/apres sont disponibles.`,
            });
          }
        } catch (_notifError) {
          // Don't block the response if notification fails
        }

        // Send email to requester
        try {
          if (refreshed.requester_email) {
            const building = await getSupabaseBuilding(refreshed.building_id);
            await resend.emails.send({
              from: "Plachet <info@plachet.be>",
              to: refreshed.requester_email,
              subject: "Votre plaquette a ete installee",
              html: generateEmailTemplate(
                "Installation terminee",
                `<p>Bonjour <strong>${refreshed.requester_name || ""}</strong>,</p>
                 <p>Votre plaquette pour l'immeuble <strong>${building?.name || ""}</strong> a ete posee avec succes.</p>
                 <p>Merci pour votre confiance.</p>`
              ),
            });
          }
        } catch (_emailError) {
          // Don't block the response if email fails
        }
      }
      res.json({ success: true });
    });

    app.get("/api/placeurs/orders", async (req, res) => {
      const auth = getAuthUser(req);
      if (!auth || auth.role !== "placeur") return res.status(403).json({ error: "Acces placeur requis." });
      // Placeur sees all en_pose/posée orders assigned to them or unassigned — no building filter
      const orders = await listSupabaseOrders("admin");
      const filtered = orders.filter((o: any) => {
        if (!["en_pose", "posée"].includes(String(o.status || ""))) return false;
        // Show orders assigned to this placeur OR not yet assigned to anyone
        return !o.placeur_id || Number(o.placeur_id) === Number(auth.userId);
      });
      res.json(filtered);
    });

    app.get("/api/orders/export", async (req, res) => {
      const auth = getAuthUser(req);
      if (!auth) return res.status(401).json({ error: "Authentification requise." });
      const role = auth.role;
      const userId = auth.userId;
      const orders = await listSupabaseOrders(role, userId);
      const issuer = userId ? await getSupabaseUserById(userId) : null;
      const pdfBuffer = buildPdfBuffer(orders, {
        issuerName: issuer?.name,
        issuerCompany: issuer?.company_name,
        issuerEmail: issuer?.email,
        issuerPhone: issuer?.phone,
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=rapport-commandes-plachet.pdf");
      res.send(pdfBuffer);
    });

    app.post("/api/orders/export/send", async (req, res) => {
      const auth = getAuthUser(req);
      if (!auth) return res.status(401).json({ error: "Authentification requise." });
      const { toEmail } = req.body;
      if (!toEmail) {
        return res.status(400).json({ error: "Email destinataire requis." });
      }

      const orders = await listSupabaseOrders(auth.role, auth.userId);
      const total = orders.length;
      const awaitingOwner = orders.filter((o: any) => OWNER_APPROVAL_PENDING_STATUSES.has(String(o.status || ""))).length;
      const installed = orders.filter((o: any) => String(o.status || "") === "posée").length;
      const cancelled = orders.filter((o: any) => String(o.status || "") === "annulée").length;
      const inProgress = orders.filter((o: any) => {
        const status = String(o.status || "");
        return !OWNER_APPROVAL_PENDING_STATUSES.has(status) && status !== "posée" && status !== "annulée";
      }).length;
      const issuer = auth.userId ? await getSupabaseUserById(Number(auth.userId)) : null;
      const pdfBase64 = buildPdfBuffer(orders, {
        issuerName: issuer?.name,
        issuerCompany: issuer?.company_name,
        issuerEmail: issuer?.email,
        issuerPhone: issuer?.phone,
      }).toString("base64");
      const periodLabel =
        orders.length > 0
          ? `${new Date(orders[orders.length - 1].created_at || Date.now()).toLocaleDateString("fr-BE")} - ${new Date(
              orders[0].created_at || Date.now()
            ).toLocaleDateString("fr-BE")}`
          : new Date().toLocaleDateString("fr-BE");

      try {
        await resend.emails.send({
          from: "Plachet <info@plachet.be>",
          to: String(toEmail),
          subject: "Rapport commandes Plachet",
          html: generateEmailTemplate(
            "Rapport commandes",
            `
            <p style="margin-top:0;">Bonjour,</p>
            <p>Veuillez trouver en pièce jointe votre rapport professionnel des commandes au format PDF.</p>
            <div style="margin:20px 0;padding:16px;border:1px solid #e4e4e7;border-radius:12px;background:#fafafa;">
              <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#71717a;font-weight:700;">Synthèse (${periodLabel})</p>
              <table width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;color:#18181b;">
                <tr><td style="padding:6px 0;">Total commandes</td><td align="right" style="padding:6px 0;font-weight:700;">${total}</td></tr>
                <tr><td style="padding:6px 0;">En attente validation propriétaire</td><td align="right" style="padding:6px 0;font-weight:700;">${awaitingOwner}</td></tr>
                <tr><td style="padding:6px 0;">En cours de traitement</td><td align="right" style="padding:6px 0;font-weight:700;">${inProgress}</td></tr>
                <tr><td style="padding:6px 0;">Terminées (posées)</td><td align="right" style="padding:6px 0;font-weight:700;">${installed}</td></tr>
                <tr><td style="padding:6px 0;">Annulées</td><td align="right" style="padding:6px 0;font-weight:700;">${cancelled}</td></tr>
              </table>
            </div>
            <p style="font-size:13px;color:#71717a;margin-bottom:0;">Le PDF contient les informations clés commande par commande (immeuble, client, lot, statut, gravure, références).</p>
            `
          ),
          attachments: [
            {
              filename: "rapport-commandes-plachet.pdf",
              content: pdfBase64,
            },
          ],
        });
        return res.json({ success: true });
      } catch (error: any) {
        return res.status(500).json({ error: error?.message || "Impossible d'envoyer le rapport." });
      }
    });

    app.get("/api/buildings/:id/owners", async (req, res) => {
      try {
        const role = String(req.query.role || "");
        const scopedRole = role || "";
        const userId = Number(req.query.userId);
        const buildingId = Number(req.params.id);

        if (!buildingId) {
          return res.status(400).json({ error: "Immeuble invalide." });
        }

        if (scopedRole !== "admin") {
          if (!userId) return res.status(400).json({ error: "Utilisateur invalide." });
          const allowedBuildings = await listSupabaseBuildings(scopedRole || "syndic", userId);
          const hasAccess = allowedBuildings.some((building: any) => Number(building.id) === buildingId);
          if (!hasAccess) return res.status(403).json({ error: "Acces refuse." });
        }

        const owners = await listSupabaseOwnersForBuilding(buildingId);
        return res.json(owners);
      } catch (error: any) {
        return res.status(500).json({ error: error?.message || "Impossible de charger les proprietaires." });
      }
    });

    app.post("/api/buildings/:id/owners", async (req, res) => {
      try {
        const buildingId = Number(req.params.id);
        const { userId, role, name, email, reference } = req.body;
        const scopedRole = role || "";

        if (!buildingId) return res.status(400).json({ error: "Immeuble invalide." });
        if (!name) return res.status(400).json({ error: "Nom proprietaire requis." });
        if (!reference) return res.status(400).json({ error: "Reference requise." });
        if (!userId) return res.status(400).json({ error: "Utilisateur invalide." });

        if (String(scopedRole || "") !== "admin") {
          const allowedBuildings = await listSupabaseBuildings(scopedRole || "syndic", Number(userId));
          const hasAccess = allowedBuildings.some((building: any) => Number(building.id) === buildingId);
          if (!hasAccess) return res.status(403).json({ error: "Acces refuse." });
        }

        const user = await getSupabaseUserById(userId);
        if (!user) return res.status(404).json({ error: "Utilisateur introuvable." });
        const organizationUserId = user.parent_id ? Number(user.parent_id) : Number(user.id);

        const owner = await upsertOwnerForOrganization(organizationUserId, String(name), email ? String(email) : null);
        await linkOwnerToBuilding(buildingId, owner.id, String(reference));
        const owners = await listSupabaseOwnersForBuilding(buildingId);
        return res.json({ success: true, owners });
      } catch (error: any) {
        return res.status(500).json({ error: error?.message || "Impossible d'enregistrer le proprietaire." });
      }
    });

    app.delete("/api/buildings/:buildingId/owners/:ownerId", async (req, res) => {
      try {
        const buildingId = Number(req.params.buildingId);
        const ownerId = Number(req.params.ownerId);
        const role = String(req.query.role || "");
        const scopedRole = role || "";
        const userId = Number(req.query.userId);

        if (!buildingId || !ownerId) return res.status(400).json({ error: "Parametres invalides." });

        if (scopedRole !== "admin") {
          if (!userId) return res.status(400).json({ error: "Utilisateur invalide." });
          const allowedBuildings = await listSupabaseBuildings(scopedRole || "syndic", userId);
          const hasAccess = allowedBuildings.some((building: any) => Number(building.id) === buildingId);
          if (!hasAccess) return res.status(403).json({ error: "Acces refuse." });
        }

        await unlinkOwnerFromBuilding(buildingId, ownerId);
        const owners = await listSupabaseOwnersForBuilding(buildingId);
        return res.json({ success: true, owners });
      } catch (error: any) {
        return res.status(500).json({ error: error?.message || "Impossible de supprimer ce proprietaire." });
      }
    });

    app.post("/api/buildings/:id/generate-link", async (req, res) => {
      const auth = getAuthUser(req);
      const { role, userId, expiresHours, maxUses, channel } = req.body || {};
      const actingRole = String(auth?.role || role || "").trim();
      const actingUserId = Number(auth?.userId || userId);
      const buildingId = Number(req.params.id);

      if (!Number.isFinite(buildingId) || buildingId <= 0) {
        return res.status(400).json({ error: "Immeuble invalide." });
      }
      if (!["admin", "syndic"].includes(actingRole)) {
        return res.status(403).json({ error: "Acces refuse." });
      }
      if (actingRole !== "admin" && !Number.isFinite(actingUserId)) {
        return res.status(400).json({ error: "Utilisateur invalide." });
      }
      if (actingRole !== "admin") {
        const allowedBuildings = await listSupabaseBuildings(actingRole, actingUserId);
        const hasAccess = allowedBuildings.some((b: any) => Number(b.id) === buildingId);
        if (!hasAccess) return res.status(403).json({ error: "Acces refuse a cet immeuble." });
      }

      const token = createSecureToken(24);
      const normalizedMaxUses = Number.isFinite(Number(maxUses)) ? Math.max(0, Number(maxUses)) : 0;
      const expiresAt = buildOrderLinkExpiresAt(Number(expiresHours || 24 * 30));
      await createSupabaseOrderLink(token, buildingId, {
        expiresAt,
        createdByUserId: Number.isFinite(actingUserId) ? actingUserId : null,
        maxUses: normalizedMaxUses,
        channel: String(channel || "public_link"),
      });
      res.json({ token, expires_at: expiresAt, max_uses: normalizedMaxUses });
    });

    app.post("/api/buildings/:id/send-link", async (req, res) => {
      const auth = getAuthUser(req);
      const { email, syndicName, role, userId, expiresHours, maxUses, channel } = req.body || {};
      const actingRole = String(auth?.role || role || "").trim();
      const actingUserId = Number(auth?.userId || userId);
      const buildingId = Number(req.params.id);

      if (!Number.isFinite(buildingId) || buildingId <= 0) {
        return res.status(400).json({ error: "Immeuble invalide." });
      }
      if (!["admin", "syndic"].includes(actingRole)) {
        return res.status(403).json({ error: "Acces refuse." });
      }
      if (actingRole !== "admin" && !Number.isFinite(actingUserId)) {
        return res.status(400).json({ error: "Utilisateur invalide." });
      }
      if (actingRole !== "admin") {
        const allowedBuildings = await listSupabaseBuildings(actingRole, actingUserId);
        const hasAccess = allowedBuildings.some((b: any) => Number(b.id) === buildingId);
        if (!hasAccess) return res.status(403).json({ error: "Acces refuse a cet immeuble." });
      }
      if (!String(email || "").trim()) {
        return res.status(400).json({ error: "Email requis." });
      }

      const building = await getSupabaseBuilding(buildingId);
      if (!building) return res.status(404).json({ error: "Immeuble non trouvé" });

      const token = createSecureToken(24);
      const normalizedMaxUses = Number.isFinite(Number(maxUses)) ? Math.max(0, Number(maxUses)) : 0;
      const expiresAt = buildOrderLinkExpiresAt(Number(expiresHours || 24 * 30));
      await createSupabaseOrderLink(token, buildingId, {
        expiresAt,
        createdByUserId: Number.isFinite(actingUserId) ? actingUserId : null,
        maxUses: normalizedMaxUses,
        channel: String(channel || "email_share"),
      });
      const appBaseUrl = resolveAppBaseUrl(req);
      const orderLink = `${appBaseUrl}/order/${token}`;

      try {
        await resend.emails.send({
          from: "Plachet <info@plachet.be>",
          to: email,
          subject: "Votre syndic vous transmet un lien de commande",
          html: generateEmailTemplate("Commande de plaquettes", `<p style="margin-top: 0;">Bonjour,</p><p>Votre syndic <strong>${syndicName}</strong> vous invite à commander vos plaquettes pour l'immeuble <strong>${building.name}</strong>.</p><p><a href="${orderLink}">Accéder au formulaire de commande</a></p>`),
        });
        res.json({ success: true });
      } catch (error) {
        console.error("Email sending error:", error);
        res.json({ success: true, warning: "SMTP non configuré, email simulé." });
      }
    });

    app.get("/api/order-links/:token", async (req, res) => {
      const link = await getSupabaseOrderLink(req.params.token);
      if (!link) return res.status(404).json({ error: "Lien invalide ou expiré" });
      const signage = await listSupabaseSignageForBuilding(link.building_id);
      res.json({ ...link, signage });
    });

    // ── Bug Reports ──

    app.post("/api/bug-reports", async (req, res) => {
      const auth = getAuthUser(req);
      if (!auth) return res.status(401).json({ error: "Authentification requise." });
      const { title, description, severity, page_url } = req.body;
      if (!title || typeof title !== "string" || title.trim().length < 3) {
        return res.status(400).json({ error: "Titre requis (min 3 caracteres)." });
      }
      try {
        const user = await getSupabaseUserById(auth.userId);
        const report = await createBugReport({
          reported_by_user_id: auth.userId,
          reporter_name: user?.name || "Inconnu",
          reporter_email: user?.email || "",
          reporter_role: auth.role,
          title: String(title).trim().slice(0, 200),
          description: String(description || "").slice(0, 5000),
          severity: ["low", "medium", "high", "critical"].includes(severity) ? severity : "medium",
          page_url: String(page_url || "").slice(0, 500),
          user_agent: String(req.headers["user-agent"] || "").slice(0, 500),
        });
        res.json(report);
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Erreur" });
      }
    });

    app.get("/api/bug-reports", async (req, res) => {
      const auth = getAuthUser(req);
      if (!auth || auth.role !== "admin") return res.status(403).json({ error: "Admin requis." });
      try {
        const reports = await listBugReports();
        res.json(reports);
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Erreur" });
      }
    });

    app.patch("/api/bug-reports/:id", async (req, res) => {
      const auth = getAuthUser(req);
      if (!auth || auth.role !== "admin") return res.status(403).json({ error: "Admin requis." });
      const { status, admin_notes } = req.body;
      const payload: Record<string, any> = {};
      if (status && ["open", "in_progress", "resolved", "closed", "wont_fix"].includes(status)) {
        payload.status = status;
        if (status === "resolved" || status === "closed") payload.resolved_at = new Date().toISOString();
      }
      if (admin_notes !== undefined) payload.admin_notes = String(admin_notes).slice(0, 5000);
      try {
        const updated = await updateBugReport(req.params.id, payload);
        res.json(updated);
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Erreur" });
      }
    });

    app.delete("/api/bug-reports/:id", async (req, res) => {
      const auth = getAuthUser(req);
      if (!auth || auth.role !== "admin") return res.status(403).json({ error: "Admin requis." });
      try {
        await deleteBugReport(req.params.id);
        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Erreur" });
      }
    });

    // ── Stats ──

    app.get("/api/stats", async (req, res) => {
      const auth = getAuthUser(req);
      if (!auth || auth.role !== "admin") return res.status(403).json({ error: "Admin requis." });
      try {
        const stats = await getStats();
        res.json(stats);
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Erreur" });
      }
    });
}

