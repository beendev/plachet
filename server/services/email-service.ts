import { getServerEnv } from "../env";

const resolveWebsiteUrl = () => {
  const env = getServerEnv();
  const fromEnv = String(env.marketingWebsiteUrl || env.appUrl || "").trim();
  return fromEnv || "https://plachet.be";
};

const resolveWebsiteLabel = () => {
  return resolveWebsiteUrl().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
};

export const generateEmailTemplate = (title: string, content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); max-width: 600px; margin: 0 auto;">
          <tr>
            <td style="padding: 40px 40px 30px 40px; text-align: center; background-color: #000000;">
              <div style="display: inline-block; background-color: #ffffff; padding: 8px 16px; border-radius: 8px; margin-bottom: 20px;">
                <span style="font-size: 20px; font-weight: 900; letter-spacing: -1px; color: #000000; text-transform: uppercase;">Plachet</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">${title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px; color: #3f3f46; font-size: 16px; line-height: 1.6;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #71717a; font-weight: 500;">L'equipe Plachet</p>
              <a href="${resolveWebsiteUrl()}" style="color: #000000; text-decoration: none; font-size: 14px; font-weight: 600;">${resolveWebsiteLabel()}</a>
              <p style="margin: 20px 0 0 0; font-size: 12px; color: #a1a1aa;">Cet email a ete envoye automatiquement, merci de ne pas y repondre.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
