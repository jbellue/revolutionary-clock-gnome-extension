// wikipediaImage.js
// Utility to fetch the main image from a Wikipedia article given its URL

import Soup from 'gi://Soup';

export async function fetchWikipediaImageUrl(soup, wikiUrl) {
    // Extract the host and article title from the URL
    const urlMatch = wikiUrl.match(/^https?:\/\/(\w+\.wikipedia\.org)\/wiki\/([^#?]+)/);
    if (!urlMatch)
        return null;
        
    const host = urlMatch[1];
    const title = decodeURIComponent(urlMatch[2]);

    const apiUrl = `https://${host}/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&pilicense=any&redirects=true&format=json&pithumbsize=320&origin=*`;

    return new Promise((resolve, reject) => {
        const message = Soup.Message.new('GET', apiUrl);
        soup.send_and_read_async(message, 0, null, (soup, res) => {
            try {
                const bytes = soup.send_and_read_finish(res);
                const response = imports.byteArray.toString(bytes.get_data());
                const data = JSON.parse(response);
                const pages = data.query && data.query.pages;
                if (pages) {
                    for (const pageId in pages) {
                        const page = pages[pageId];
                        if (page.thumbnail && page.thumbnail.source) {
                            resolve(page.thumbnail.source);
                            return;
                        }
                    }
                }
                log(`[RevolutionaryClock] No thumbnail found in API response for: ${wikiUrl}`);
                resolve(null);
            } catch (e) {
                log(`[RevolutionaryClock] Error fetching Wikipedia image for: ${wikiUrl}, Error: ${e}`);
                resolve(null);
            }
        });
    });
}
