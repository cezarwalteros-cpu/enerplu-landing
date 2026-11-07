# ENERPLU · landing de Shopify con formulario incrustado

Copia de la landing de Shopify (`losgomosos.lat/products/enerplu`, GemPages) publicada en Vercel.
Una sola sección de oferta + formulario contra entrega, justo antes de las reseñas con fotos: las 3 ofertas
con el diseño del selector v13 (se elige tocando la tarjeta) y debajo los datos de envío.
Se quitaron el selector viejo con Releasit, los testimonios de WhatsApp y las reseñas sin fotos.

- **Pedidos:** van al checkout nativo (`checkout-native`, slug `enerplu`): numeración ENL-, CAPI, carritos
  abandonados, antifraude, 1 pedido por número cada 24 h. Los precios los pone el servidor.
- **Embudo del CRM:** la página se registra como `<dominio>/` (ej. `oferta.enerplu.com/`) para separarla de Shopify.
- **Pixel:** 1248121626590977 (PageView, ViewContent, InitiateCheckout y Purchase con el mismo event_id de CAPI).
- **Pixel TikTok:** D7MGRHBC77U8CJLL8D70 (`TIKTOK_PIXEL` en build.py): PageView, ViewContent, InitiateCheckout, AddPaymentInfo,
  PlaceAnOrder, CompletePayment y Purchase con el mismo event_id que la Events API de checkout-native. En `?ep_test=1` no se envía la compra.
- **Prueba sin crear pedidos:** agrega `?ep_test=1` a la URL.

## Cómo se arma
`python3 build.py` → `public/index.html`.

- `fuente/shopify.json`: secciones de la página tal como las sirve Shopify (capturadas el 31-oct-2026).
- `fuente/oferta-formulario.html`, `fuente/oferta.css`, `fuente/oferta-selector.js`: la sección de oferta + formulario.
- `fuente/formulario/`: lógica del formulario (la misma de pedido.enerplu.com).
- Qué secciones de Shopify quedan y en qué orden: `ORDER` en `build.py`.

Cada push a `main` se publica solo en Vercel.
