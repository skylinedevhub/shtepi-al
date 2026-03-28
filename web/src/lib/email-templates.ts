// Brand palette
const NAVY = "#1B2A4A";
const CREAM = "#FDF8F0";
const TERRACOTTA = "#C75B39";
const GOLD = "#D4A843";

function layout(body: string): string {
  return `<!DOCTYPE html>
<html lang="sq">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background-color:${CREAM};font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${CREAM};">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background-color:${NAVY};padding:24px 32px;text-align:center;">
            <span style="color:${GOLD};font-size:28px;font-weight:bold;letter-spacing:1px;">ShtëpiAL</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:${NAVY};font-size:16px;line-height:1.6;">
            ${body}
          </td>
        </tr>
        <tr>
          <td style="background-color:${NAVY};padding:16px 32px;text-align:center;">
            <span style="color:${CREAM};font-size:13px;">&copy; ShtëpiAL — Platforma e pasurive të paluajtshme në Shqipëri</span>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function button(url: string, label: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr><td style="background-color:${TERRACOTTA};border-radius:6px;padding:12px 28px;">
    <a href="${url}" style="color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;">${label}</a>
  </td></tr>
</table>`;
}

export function welcomeEmail(userName: string): { subject: string; html: string } {
  return {
    subject: "Mirë se vini në ShtëpiAL",
    html: layout(`
      <h2 style="color:${NAVY};margin:0 0 16px;">Mirë se vini, ${userName}!</h2>
      <p>Faleminderit që u regjistruat në ShtëpiAL — platformën më të madhe të pasurive të paluajtshme në Shqipëri.</p>
      <p>Tani mund të:</p>
      <ul>
        <li>Kërkoni prona për shitje dhe me qira</li>
        <li>Ruani njoftimet tuaja të preferuara</li>
        <li>Publikoni njoftimet tuaja</li>
      </ul>
      <p>Suksese!</p>
    `),
  };
}

export function listingApprovedEmail(
  listingTitle: string,
  listingUrl: string
): { subject: string; html: string } {
  return {
    subject: "Njoftimi juaj u aprovua",
    html: layout(`
      <h2 style="color:${NAVY};margin:0 0 16px;">Njoftimi juaj u aprovua!</h2>
      <p>Njoftimi <strong>"${listingTitle}"</strong> është aprovuar dhe tani është i dukshëm në platformë.</p>
      ${button(listingUrl, "Shiko njoftimin")}
    `),
  };
}

export function listingRejectedEmail(
  listingTitle: string,
  reason: string
): { subject: string; html: string } {
  return {
    subject: "Njoftimi juaj u refuzua",
    html: layout(`
      <h2 style="color:${NAVY};margin:0 0 16px;">Njoftimi juaj u refuzua</h2>
      <p>Na vjen keq, por njoftimi <strong>"${listingTitle}"</strong> nuk u aprovua.</p>
      <p><strong>Arsyeja:</strong> ${reason}</p>
      <p>Ju mund ta ndryshoni njoftimin dhe ta dërgoni përsëri për aprovim.</p>
    `),
  };
}

export function passwordResetEmail(resetUrl: string): { subject: string; html: string } {
  return {
    subject: "Rivendosni fjalëkalimin",
    html: layout(`
      <h2 style="color:${NAVY};margin:0 0 16px;">Rivendosni fjalëkalimin</h2>
      <p>Keni kërkuar rivendosjen e fjalëkalimit për llogarinë tuaj në ShtëpiAL.</p>
      ${button(resetUrl, "Rivendos fjalëkalimin")}
      <p style="font-size:14px;color:#666;">Nëse nuk e keni kërkuar këtë, injoroni këtë email.</p>
    `),
  };
}

export function emailVerificationEmail(verifyUrl: string): { subject: string; html: string } {
  return {
    subject: "Verifikoni emailin tuaj",
    html: layout(`
      <h2 style="color:${NAVY};margin:0 0 16px;">Verifikoni emailin tuaj</h2>
      <p>Ju lutem klikoni butonin më poshtë për të verifikuar adresën tuaj të emailit.</p>
      ${button(verifyUrl, "Verifiko emailin")}
      <p style="font-size:14px;color:#666;">Nëse nuk e keni krijuar një llogari, injoroni këtë email.</p>
    `),
  };
}
