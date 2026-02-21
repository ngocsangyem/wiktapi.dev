# Word Categories

Wiktapi organizes words by **category** rather than Wiktionary editions. This provides a more intuitive way to explore and filter vocabulary across multiple domains.

## What is a category?

A **category** is a semantic domain that classifies words by their primary subject area. Each word in the database is assigned exactly one category from the following list:

```
technology, business, travel, music, movies,
sports, food, art, science, health,
fashion, gaming, books, nature, photography,
education, history, politics, automotive, pets,
general
```

## Default category

When a word doesn't have domain-specific classification, it defaults to `general`. This includes common words like "the", "run", "chat", and other everyday vocabulary.

## List all categories

To see which categories are available in your instance:

```bash
curl https://api.wiktapi.dev/v1/categories
# { "categories": ["art", "business", "education", ... "technology"] }
```

## Filter by category

All word endpoints accept an optional `?category=` query parameter:

```bash
# Technology-related search
GET /v1/search?q=data&category=technology

# Sports vocabulary
GET /v1/word/tennis?category=sports

# Business definitions
GET /v1/word/market/definitions?category=business
```

If the word is not in the requested category, the API returns a 404 Not Found response.
