/** Создаёт HTTPS-ссылку на публичную страницу авторизации с токеном во fragment; HTTP разрешён только в dev. */
export function authEmailUrl(path: string, token: string): string {
	const siteUrl = process.env.SITE_URL || (process.env.NODE_ENV === "dev" ? "http://localhost:4400" : "");
	const url = new URL(path, siteUrl);

	if (url.protocol !== "https:" && !(process.env.NODE_ENV === "dev" && url.protocol === "http:")) {
		throw new Error("SITE_URL must use HTTPS outside development");
	}

	url.hash = new URLSearchParams({ token }).toString();
	return url.toString();
}
