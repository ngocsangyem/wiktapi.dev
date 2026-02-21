# Quickstart

Get your first response from Wiktapi in under a minute. No API key required.

## Make your first request

Fetch a word entry:

```bash
curl "https://api.wiktapi.dev/v1/word/chat"
```

```json
{
  "word": "chat",
  "phonetic": "/tʃæt/",
  "phonetics": [
    { "text": "/tʃæt/", "type": "uk", "audioUrl": null },
    { "text": "/tʃæt/", "type": "us", "audioUrl": null }
  ],
  "meanings": [
    {
      "partOfSpeech": "noun",
      "definitions": [
        { "definition": "an informal conversation" },
        { "definition": "a small domesticated carnivorous mammal" }
      ],
      "translate": null,
      "synonyms": ["conversation", "talk"]
    }
  ],
  "category": "general",
  "translate": null,
  "tenses": null
}
```

## Fetch just the definitions

Use the `/definitions` sub-resource to get only definitions by part of speech:

```bash
curl "https://api.wiktapi.dev/v1/word/run/definitions"
```

## Search for words

Prefix search returns up to 50 matches:

```bash
curl "https://api.wiktapi.dev/v1/search?q=chat"
```

## Filter by category

All endpoints support optional category filtering:

```bash
curl "https://api.wiktapi.dev/v1/search?q=sport&category=sports"
```

Available categories: `technology`, `business`, `travel`, `music`, `movies`, `sports`, `food`, `art`, `science`, `health`, `fashion`, `gaming`, `books`, `nature`, `photography`, `education`, `history`, `politics`, `automotive`, `pets`, `general`.

## Explore all endpoints

| Endpoint                             | Description                          |
| ------------------------------------ | ------------------------------------ |
| `GET /v1/word/{word}`                | Full entry with phonetics & meanings |
| `GET /v1/word/{word}/definitions`    | Definitions by part of speech        |
| `GET /v1/word/{word}/translations`   | Translation information              |
| `GET /v1/word/{word}/pronunciations` | Phonetic data and audio              |
| `GET /v1/word/{word}/tenses`         | Inflected forms and tenses           |
| `GET /v1/search?q=`                  | Prefix search (up to 50 results)     |
| `GET /v1/categories`                 | List all available categories        |

All word endpoints accept an optional `?category={name}` query parameter to filter results.

## Next steps

- Browse all endpoints in the [API Explorer](https://api.wiktapi.dev/_scalar)
- [Self-host your own instance](/guides/self-hosting)
