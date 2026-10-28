import { escapeHtml } from './mail-template';


export const MAIL_LOGO_CID = 'amstore-logo@ameralds';

export function renderMailLayout(title: string, preheader: string, content: string, footer = 'Письмо сформировано автоматически по вашему заказу.'): string {
    return `<!doctype html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>${escapeHtml(title)}</title>
    <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0; mso-table-rspace: 0; }
        img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
        @media only screen and (max-width: 600px) {
            .mail-outer { padding: 16px 8px !important; }
            .mail-content { padding: 24px 16px !important; }
            .product-card, .product-card > tbody, .product-card > tbody > tr { display: block !important; width: 100% !important; box-sizing: border-box; }
            .product-image-cell, .product-details { display: block !important; width: 100% !important; box-sizing: border-box; }
            .product-image { width: 100% !important; border-radius: 7px 7px 0 0 !important; }
            .product-details { padding: 16px !important; }
            .order-heading { font-size: 26px !important; line-height: 32px !important; }
        }
    </style>
</head>
<body style="margin:0;padding:0;width:100%;background-color:#edf5ee;color:#393939;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;font-size:1px;line-height:1px;color:#edf5ee;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;background-color:#edf5ee;">
        <tr><td class="mail-outer" align="center" style="padding:32px 16px;">
            <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:640px;table-layout:fixed;">
                <tr><td align="center" style="padding:0 0 24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                            <td style="padding-right:14px;"><img src="cid:${MAIL_LOGO_CID}" alt="" width="47" height="50" style="display:block;width:47px;height:50px;"></td>
                            <td style="color:#38473a;font-size:24px;font-weight:bold;letter-spacing:3px;">AMSTORE</td>
                        </tr>
                    </table>
                </td></tr>
                <tr><td class="mail-content" style="padding:32px;background-color:#ffffff;border:1px solid #cadccb;border-radius:12px;">
                    ${content}
                </td></tr>
                <tr><td align="center" style="padding:20px 16px 0;color:#707070;font-size:12px;line-height:18px;">
                    AMSTORE · Схемы и подборы<br>
                    ${escapeHtml(footer)}
                </td></tr>
            </table>
        </td></tr>
    </table>
</body>
</html>`;
}
