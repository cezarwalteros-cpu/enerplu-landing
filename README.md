# ENERPLU · landing de Shopify con formulario incrustado

Copia de la landing de Shopify (`losgomosos.lat/products/enerplu`, GemPages) publicada en Vercel.
El carrusel "Elige tu plan" ya no abre Releasit: "Pedir y pagar al recibir" marca el plan en el
formulario contra entrega que está justo debajo y baja a él.

- **Pedidos:** van al checkout nativo (`checkout-native`, slug `enerplu`): numeración ENL-, CAPI, carritos
  abandonados, antifraude, 1 pedido por número cada 24 h. Los precios los pone el servidor.
- **Embudo del CRM:** la página se registra como `<dominio>/` (ej. `oferta.enerplu.com/`) para separarla de Shopify.
- **Pixel:** 1248121626590977 (PageView, ViewContent, InitiateCheckout y Purchase con el mismo event_id de CAPI).
- **Prueba sin crear pedidos:** agrega `?ep_test=1` a la URL.

## Cómo se arma
`python3 build.py` → `public/index.html`.

- `fuente/shopify.json`: secciones de la página tal como las sirve Shopify (capturadas el 31-oct-2026).
- `fuente/formulario/`: formulario, estilos y lógica (los mismos de pedido.enerplu.com).

Cada push a `main` se publica solo en Vercel.
