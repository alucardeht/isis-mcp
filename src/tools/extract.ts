import * as cheerio from "cheerio";

interface ExtractParams {
  url: string;
  schema: "article" | "product" | "contact" | "links" | "images" | "meta" | "all";
}

interface ExtractResult {
  url: string;
  schema: string;
  data: Record<string, unknown>;
  extractedAt: string;
}

export async function extractData(params: ExtractParams): Promise<ExtractResult> {
  const { url, schema } = params;

  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);

  let data: Record<string, unknown> = {};

  const extractMeta = () => ({
    title: $("title").text().trim(),
    description: $('meta[name="description"]').attr("content"),
    keywords: $('meta[name="keywords"]').attr("content"),
    author: $('meta[name="author"]').attr("content"),
    canonical: $('link[rel="canonical"]').attr("href"),
    ogTitle: $('meta[property="og:title"]').attr("content"),
    ogDescription: $('meta[property="og:description"]').attr("content"),
    ogImage: $('meta[property="og:image"]').attr("content"),
    ogType: $('meta[property="og:type"]').attr("content"),
    twitterCard: $('meta[name="twitter:card"]').attr("content"),
    robots: $('meta[name="robots"]').attr("content"),
  });

  const extractLinks = () => {
    const links: { href: string; text: string }[] = [];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      const text = $(el).text().trim();
      if (href && text) {
        links.push({ href, text: text.slice(0, 100) });
      }
    });
    return links.slice(0, 100);
  };

  const extractImages = () => {
    const images: { src: string; alt: string }[] = [];
    $("img[src]").each((_, el) => {
      const src = $(el).attr("src");
      const alt = $(el).attr("alt") || "";
      if (src) {
        images.push({ src, alt });
      }
    });
    return images.slice(0, 50);
  };

  const extractArticle = () => ({
    title: $("h1").first().text().trim() || $("title").text().trim(),
    author: $('[rel="author"]').text().trim() || $('[itemprop="author"]').text().trim() || $('meta[name="author"]').attr("content"),
    publishedAt: $('[itemprop="datePublished"]').attr("content") || $("time[datetime]").attr("datetime"),
    content: $("article").text().trim() || $("main").text().trim() || $("body").text().trim(),
    wordCount: ($("article").text() || $("body").text()).split(/\s+/).length,
  });

  const extractProduct = () => ({
    name: $('[itemprop="name"]').text().trim() || $("h1").first().text().trim(),
    price: $('[itemprop="price"]').attr("content") || $(".price").first().text().trim(),
    currency: $('[itemprop="priceCurrency"]').attr("content"),
    description: $('[itemprop="description"]').text().trim() || $('meta[name="description"]').attr("content"),
    image: $('[itemprop="image"]').attr("src") || $('meta[property="og:image"]').attr("content"),
    availability: $('[itemprop="availability"]').attr("content"),
    rating: $('[itemprop="ratingValue"]').attr("content"),
    reviewCount: $('[itemprop="reviewCount"]').attr("content"),
    brand: $('[itemprop="brand"]').text().trim(),
    sku: $('[itemprop="sku"]').attr("content"),
  });

  const extractContact = () => {
    const emails: string[] = [];
    const phones: string[] = [];
    const text = $("body").text();

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;

    const emailMatches = text.match(emailRegex);
    const phoneMatches = text.match(phoneRegex);

    if (emailMatches) emails.push(...new Set(emailMatches));
    if (phoneMatches) phones.push(...new Set(phoneMatches));

    return {
      emails: emails.slice(0, 10),
      phones: phones.slice(0, 10),
      address: $('[itemprop="address"]').text().trim() || $(".address").text().trim(),
    };
  };

  switch (schema) {
    case "meta":
      data = extractMeta();
      break;
    case "links":
      data = { links: extractLinks() };
      break;
    case "images":
      data = { images: extractImages() };
      break;
    case "article":
      data = extractArticle();
      break;
    case "product":
      data = extractProduct();
      break;
    case "contact":
      data = extractContact();
      break;
    case "all":
      data = {
        meta: extractMeta(),
        article: extractArticle(),
        product: extractProduct(),
        contact: extractContact(),
        links: extractLinks(),
        images: extractImages(),
      };
      break;
  }

  return {
    url,
    schema,
    data,
    extractedAt: new Date().toISOString(),
  };
}
