function createEmbeds(embeds) {
	// Only keep fields used by DiscordEmbed component
	return (embeds ?? []).map(e => ({
		title: e.title ?? undefined,
		author: e.author
			? {
				name: e.author.name,
				url: e.author.url,
				iconURL: e.author.iconURL,
				proxyIconURL: e.author.proxyIconURL,
			}
			: undefined,
		color: e.hexColor ?? e.color ?? undefined,
		image: e.image
			? {
				url: e.image.url,
				proxyURL: e.image.proxyURL,
			}
			: undefined,
		thumbnail: e.thumbnail
			? {
				url: e.thumbnail.url,
				proxyURL: e.thumbnail.proxyURL,
			}
			: undefined,
		url: e.url ?? undefined,
		description: e.description ?? undefined,
		fields: Array.isArray(e.fields)
			? e.fields.map(f => ({
				name: f.name,
				value: f.value,
				inline: f.inline,
			}))
			: [],
		footer: e.footer
			? {
				text: e.footer.text,
				iconURL: e.footer.iconURL,
				proxyIconURL: e.footer.proxyIconURL,
			}
			: undefined,
		timestamp: e.timestamp ?? undefined,
	}));
}

module.exports = { createEmbeds };


