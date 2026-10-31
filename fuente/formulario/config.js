/* =====================================================================
   ENERPLU PDP — FUENTE ÚNICA DE VERDAD
   Todo precio, pack, imagen, texto de condiciones y modo de checkout
   sale de aquí. No escribas precios en el HTML: se pintan desde aquí.
   ===================================================================== */
window.EP_CONFIG = {
  brand: 'ENERPLU',
  invima: 'NSA2314-2025',
  singleBoxPrice: 89900,          // precio real de 1 caja suelta (referencia de ahorro)
  defaultPack: 'dominio',
  displayOrder: ['dominio', 'elite', 'inicial'],   // orden en pantalla: Dominio primero, Básico al final
  theme: 'claro',                 // 'claro' (blanco/negro/rojo) · 'negro' (negro/rojo) · 'azul' (blanco/azul/naranja)

  /* Packs — precios y composición tomados del catálogo del CRM (27-oct-2026).
     funnelishIndex = posición del producto en el Product List nativo (0,1,2). */
  packs: [
    {
      id: 'inicial',
      name: 'Plan Básico',
      boxes: 1, tablets: 10,
      price: 89900,
      gifts: ['Sobre de lubricante'],
      badge: '',
      lite: true,                                 // tarjeta reducida: plan para probar
      missing: ['Sin spray retardante'],          // lo que NO trae frente a los otros planes
      shipping: 'Envío gratis',
      galleryMedia: 'flatInicial',
      flatlay: 'flatInicial',                                  // imagen de la galería que muestra este pack
      funnelishIndex: 0,
      checkoutPlan: 'basico',                    // clave del plan en el checkout (modo redirect)
      offerKey: 'x1',                            // clave de la oferta en checkout-native (formulario en página)
      redirectUrl: ''                            // opcional: URL propia de este plan
    },
    {
      id: 'dominio',
      name: 'Plan Dominio Total',
      boxes: 2, tablets: 20,
      price: 129900,
      gifts: ['Spray retardante 30 ml', 'Sobre de lubricante'],
      badge: 'Más vendido',
      shipping: 'Envío gratis',
      flatlay: 'flatDominio',
      funnelishIndex: 1,
      checkoutPlan: 'dominio',
      offerKey: 'dominio',
      redirectUrl: ''
    },
    {
      id: 'elite',
      name: 'Plan Élite',
      boxes: 4, tablets: 40,
      price: 159900,
      gifts: ['Spray retardante 30 ml', 'Sobre de lubricante'],
      badge: 'Mejor precio',
      badgeAlt: true,
      shipping: 'Envío gratis',
      galleryMedia: 'flatElite',
      flatlay: 'flatElite',
      funnelishIndex: 2,
      checkoutPlan: 'elite',
      offerKey: 'elite',
      redirectUrl: ''
    }
  ],

  /* Galería del hero: 6 imágenes (URLs de la hoja enerplu-imagenes-pdp, 27-oct-2026).
     Si un día quieres que una imagen cambie según el plan, agrega planSlide: true a esa imagen. */
  gallery: [
    { type: 'img', src: 'https://res.cloudinary.com/dzlys7ftg/image/upload/v1793135585/enerplu-galeria-1-producto_ynanai.webp', alt: 'Caja de ENERPLU con tabletas masticables', label: 'Producto' },
    { type: 'img', src: 'https://res.cloudinary.com/dzlys7ftg/image/upload/v1793135585/enerplu-galeria-3-tableta-mano_zvzebz.webp', alt: 'Lo que recibes en ENERPLU', label: 'Tu plan' },
    { type: 'img', src: 'https://res.cloudinary.com/dzlys7ftg/image/upload/v1793136240/enerplu-galeria-3-tableta-mano.webp_ldiboe.webp', alt: 'Tableta de ENERPLU en la mano', label: 'Tableta' },
    { type: 'img', src: 'https://res.cloudinary.com/dzlys7ftg/image/upload/v1793135585/enerplu-galeria-4-como-se-usa_nigqgb.webp', alt: 'Cómo se usa ENERPLU en 3 pasos', label: 'Cómo se usa' },
    { type: 'img', src: 'https://res.cloudinary.com/dzlys7ftg/image/upload/v1793135586/enerplu-galeria-5-ingredientes_t4ggjs.webp', alt: 'Tableta de ENERPLU y sus 5 ingredientes', label: 'Ingredientes' },
    { type: 'img', src: 'https://res.cloudinary.com/dzlys7ftg/image/upload/v1793135586/enerplu-galeria-6-asi-llega_ygbfax.webp', alt: 'Así llega: bolsa negra sellada', label: 'Así llega' }
  ],
  cdnOptimize: true,              // Cloudinary: entrega cada imagen en el formato y ancho justos (f_auto,q_auto,w_…)

  /* Condiciones reales que se muestran en la página */
  /* MATERIAL VISUAL — pega la URL cuando tengas cada foto o video.
     Vacío = esa pieza no aparece y la sección usa su versión sin foto.
     `shot` describe la toma (es la lista de fotos; en la vista previa aparece en cada espacio).
     Fotos: celular, luz de ventana, superficie oscura o neutra, solo manos. JPG/WebP ≤ 200 KB, cuadradas salvo que se indique. */
  media: {
    video:     { src: 'https://res.cloudinary.com/dzlys7ftg/image/upload/v1793135596/enerplu-video-asi-llega_r4gaca.webp', poster: '',   // por ahora es una imagen; cuando haya video, pega aquí el .mp4
                shot: 'Video vertical 9:16, 15–20 s, sin sonido: llega la bolsa negra sellada → se abre → sale la caja → tableta rosada en la mano. MP4 ≤ 1,5 MB + una foto del primer cuadro como portada.' },
    step1:     { src: 'https://res.cloudinary.com/dzlys7ftg/image/upload/v1793135593/enerplu-paso-1-tableta_vwsbmb.webp', shot: 'Macro: una tableta entre dos dedos, fondo oscuro. Que se vea la textura moteada.' },
    step2:     { src: 'https://res.cloudinary.com/dzlys7ftg/image/upload/v1793135593/enerplu-paso-2-boca_gwtwy3.webp', shot: 'Mano llevando la tableta a la boca, de perfil. Solo labios y mano, sin la cara completa.' },
    step3:     { src: 'https://res.cloudinary.com/dzlys7ftg/image/upload/v1793135861/enerplu-paso-3-reloj_f5gtsu.webp', shot: 'Celular o reloj marcando la hora con la caja de ENERPLU al lado.' },
    formula:   { src: 'https://res.cloudinary.com/dzlys7ftg/image/upload/v1793135586/enerplu-galeria-5-ingredientes_t4ggjs.webp', shot: 'Cenital: una tableta en el centro sobre superficie oscura, con espacio alrededor.' },
    maca:      { src: 'https://res.cloudinary.com/dzlys7ftg/image/upload/v1793135591/enerplu-ingrediente-maca_z2rcwq.webp', shot: 'Raíz de maca negra (cruda o en polvo) en un platico o cuchara.' },
    ginseng:   { src: 'https://res.cloudinary.com/dzlys7ftg/image/upload/v1793135589/enerplu-ingrediente-ginseng_gjdpt5.webp', shot: 'Raíz de ginseng.' },
    arginina:  { src: 'https://res.cloudinary.com/dzlys7ftg/image/upload/v1793135588/enerplu-ingrediente-arginina_ahzrk9.webp', shot: 'Polvo blanco en una cuchara (L‑arginina).' },
    magnesio:  { src: 'https://res.cloudinary.com/dzlys7ftg/image/upload/v1793135592/enerplu-ingrediente-magnesio_vmmlua.webp', shot: 'Polvo blanco fino en un platico (glicinato de magnesio).' },
    inositol:  { src: 'https://res.cloudinary.com/dzlys7ftg/image/upload/v1793135589/enerplu-ingrediente-inositol_fgikup.webp', shot: 'Cristales o polvo blanco en una cuchara (inositol).' },
    compareUs:   { src: 'https://res.cloudinary.com/dzlys7ftg/image/upload/v1793136044/enerplu-comparativa-enerplu_qwyrfu.webp', shot: 'Caja de ENERPLU abierta con tabletas afuera, buena luz.' },
    compareThem: { src: 'https://res.cloudinary.com/dzlys7ftg/image/upload/v1775097458/otras_marcas_ulah9k.webp', shot: 'Frasco genérico de cápsulas, sin marca visible. La página lo pone en gris.' },
    package:   { src: 'https://res.cloudinary.com/dzlys7ftg/image/upload/v1793135586/enerplu-galeria-6-asi-llega_ygbfax.webp', shot: 'La bolsa negra sellada tal como la entrega el mensajero, con la etiqueta de datos borrosa.' },
    flatInicial: { src: 'https://res.cloudinary.com/dzlys7ftg/image/upload/v1793135594/enerplu-plan-basico_qgrtmm.webp', shot: 'Flat-lay Plan Básico: 1 caja + sobre de lubricante, cenital, fondo claro.' },
    flatDominio: { src: 'https://res.cloudinary.com/dzlys7ftg/image/upload/v1793135595/enerplu-plan-dominio_tk8ac0.webp', shot: 'Flat-lay Dominio Total: 2 cajas + spray retardante 30 ml + sobre de lubricante.' },
    flatElite:   { src: 'https://res.cloudinary.com/dzlys7ftg/image/upload/v1793135595/enerplu-plan-elite_jxkwtq.webp', shot: 'Flat-lay Élite: 4 cajas + spray retardante 30 ml + sobre de lubricante.' }
  },

  deliveryText: 'Llega en 3 a 4 días hábiles según tu ciudad.',
  prepaidOnlyZones: 'San Andrés y Providencia, Amazonas, Vichada, Guainía, Vaupés y Tumaco',
  guarantee: { enabled: false, text: '' },                       // actívala solo si la vas a cumplir
  links: { privacy: '', terms: '' },                             // URLs de tus políticas (se ocultan si están vacías)

  /* Reseñas de clientes. Se cargan desde src/reviews.json al hacer el build
     (en el bloque publicado quedan en window.EP_CONFIG.reviews). Formato:
     { name, age, city, rating (1-5), uso, text, photo (URL o null) } */
  reviews: [],
  reviewsInitial: 6,                // tarjetas visibles al cargar
  reviewsStep: 8,                   // cuántas más muestra cada "Ver más"
  discreetQuotes: ['Eduardo B.', 'Rubén M.'],   // reseñas que se repiten en la sección de discreción

  /* Chats de WhatsApp (carrusel automático, opcional). Vacío = no aparece.
       texto:   { name, city, time, messages: ['...', '...'] }
       captura: { name, city, image: 'https://.../captura.jpg' } */
  chats: [],
  chatsSpeed: 7,


  /* Checkout
     'redirect'  → manda al checkout nativo de Bolt con el plan elegido y los UTM/fbclid de la visita
     'funnelish' → selecciona el producto en el Product List nativo de Funnelish y baja al formulario
     'demo'      → vista previa (nunca simula pedidos) */
  checkout: {
    mode: 'redirect',
    url: 'https://checkout.enerplu.com/c/enerplu',
    planParam: 'plan',
    anchor: '#ep-checkout',
    /* modo 'inline' (versión con formulario en la misma página): envía el pedido directo al backend del checkout */
    api: 'https://mqwscbpdozrdiqxofmod.supabase.co/functions/v1/checkout-native',
    slug: 'enerplu',
    funnelApi: 'https://mqwscbpdozrdiqxofmod.supabase.co/functions/v1/funnel-track',
    /* valores de respaldo; al cargar el formulario se actualizan con la configuración real del checkout */
    bump: { price: 19900, compare: 29900, title: 'Estrechante Premium 30 ml', text: 'Para ella. Precio solo en este pedido y llega en el mismo paquete discreto.',
            image: 'https://res.cloudinary.com/dzlys7ftg/image/upload/v1774019347/ESTRECHANTE_mvgh1z.webp' },
    express: { price: 5000, title: 'Express', text: 'Despacho con prioridad y envío asegurado' },
    thanksTitle: '¡Pedido recibido!',
    thanksText: 'Te escribiremos por WhatsApp para confirmar tu pedido. Ten tu celular a la mano.',
    deliveryDays: [3, 4],
    /* festivos de Colombia (no cuentan como día hábil para la fecha estimada de entrega) */
    holidays: ['2026-11-02', '2026-11-16', '2026-12-08', '2026-12-25', '2027-01-01', '2027-01-11', '2027-03-22', '2027-03-25', '2027-03-26', '2027-05-01'],
    funnelish: {
      itemSelector: '.pl-item',
      clickSelector: '.pl-inner, label',
      radioSelector: 'input[type="radio"][name="product-id"]',
      listSelector: '[class*="product-list"], [data-id*="ProductList"], [class*="ProductList"]',
      hideNativeList: true,
      maxRetries: 20
    }
  },

  /* Pixel: el checkout de Bolt ya tiene el pixel 1248121626590977 y dispara sus eventos estándar.
     Aquí solo van eventos custom para no duplicar. */
  tracking: { fireStandardEvents: false, prefix: 'EP_', pixelId: '1248121626590977' }
};
