import { cargarProductos } from "./api.js";
import { obtenerCarrito, guardarCarrito, vaciarAlmacenamiento } from "./storage.js";

const contenedorProductos = document.getElementById("productos");
const contenedorCarrito = document.getElementById("carrito");
const estadoCarga = document.getElementById("estadoCarga");
const textoTotal = document.getElementById("total");
const buscador = document.getElementById("buscador");
const filtroCategoria = document.getElementById("filtroCategoria");

let catalogo = [];
let carrito = obtenerCarrito();

const formatearPrecio = (valor) =>
  valor.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const notificar = (texto, color = "#198754") =>
  Toastify({ text: texto, duration: 2200, gravity: "bottom", position: "right", style: { background: color } }).showToast();

// ---------- Catálogo ----------
function llenarCategorias() {
  const categorias = [...new Set(catalogo.map(({ categoria }) => categoria))];
  filtroCategoria.innerHTML = ["Todas", ...categorias]
    .map((categoria) => `<option value="${categoria}">${categoria}</option>`)
    .join("");
}

function renderizarProductos() {
  const texto = buscador.value.trim().toLowerCase();
  const categoria = filtroCategoria.value || "Todas";

  const visibles = catalogo.filter(({ nombre, categoria: categoriaProducto }) =>
    nombre.toLowerCase().includes(texto) && (categoria === "Todas" || categoriaProducto === categoria)
  );

  contenedorProductos.innerHTML = visibles.length
    ? visibles.map(({ id, nombre, precio, stock, imagen, categoria: cat }) => `
      <div class="col-sm-6 col-xl-4">
        <div class="card h-100 shadow-sm tarjeta-producto">
          <img src="${imagen}" class="card-img-top" alt="${nombre}">
          <div class="card-body d-flex flex-column">
            <span class="badge text-bg-secondary align-self-start mb-1">${cat}</span>
            <h6 class="card-title">${nombre}</h6>
            <p class="mb-1 fw-bold">${formatearPrecio(precio)}</p>
            <small class="text-muted mb-2">Stock: ${stock}</small>
            <button class="btn btn-primary mt-auto" data-accion="agregar" data-id="${id}">Agregar al carrito</button>
          </div>
        </div>
      </div>`).join("")
    : `<p class="text-center text-muted">No hay productos que coincidan con la búsqueda.</p>`;
}

// ---------- Carrito ----------
function calcularTotal() {
  return carrito.reduce((acumulado, { precio, cantidad }) => acumulado + precio * cantidad, 0);
}

function renderizarCarrito() {
  contenedorCarrito.innerHTML = carrito.length
    ? carrito.map(({ id, nombre, precio, cantidad }) => `
      <div class="item-carrito">
        <div class="d-flex justify-content-between">
          <span>${nombre}</span>
          <button class="btn-close" aria-label="Quitar" data-accion="quitar" data-id="${id}"></button>
        </div>
        <div class="d-flex justify-content-between align-items-center mt-1">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-secondary" data-accion="restar" data-id="${id}">−</button>
            <span class="btn btn-light disabled">${cantidad}</span>
            <button class="btn btn-outline-secondary" data-accion="sumar" data-id="${id}">+</button>
          </div>
          <strong>${formatearPrecio(precio * cantidad)}</strong>
        </div>
      </div>`).join("")
    : `<p class="text-muted mb-0">Tu carrito está vacío.</p>`;

  textoTotal.textContent = formatearPrecio(calcularTotal());
}

function actualizarCarrito() {
  guardarCarrito(carrito);
  renderizarCarrito();
}

function agregarAlCarrito(idProducto) {
  const producto = catalogo.find(({ id }) => id === idProducto);
  const itemExistente = carrito.find(({ id }) => id === idProducto);
  const cantidadActual = itemExistente?.cantidad || 0;

  if (cantidadActual >= producto.stock) {
    notificar("No hay más stock disponible", "#dc3545");
    return;
  }

  itemExistente
    ? itemExistente.cantidad++
    : carrito.push({ id: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad: 1 });

  actualizarCarrito();
  notificar(`${producto.nombre} agregado`);
}

function cambiarCantidad(idProducto, variacion) {
  const item = carrito.find(({ id }) => id === idProducto);
  const { stock } = catalogo.find(({ id }) => id === idProducto);
  const nuevaCantidad = item.cantidad + variacion;

  if (nuevaCantidad > stock) {
    notificar("Alcanzaste el stock máximo", "#dc3545");
    return;
  }
  if (nuevaCantidad <= 0) {
    quitarDelCarrito(idProducto);
    return;
  }
  item.cantidad = nuevaCantidad;
  actualizarCarrito();
}

function quitarDelCarrito(idProducto) {
  carrito = carrito.filter(({ id }) => id !== idProducto);
  actualizarCarrito();
}

async function vaciarCarrito() {
  if (!carrito.length) return;
  const { isConfirmed } = await Swal.fire({
    title: "¿Vaciar el carrito?",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Sí, vaciar",
    cancelButtonText: "Cancelar"
  });
  if (!isConfirmed) return;
  carrito = [];
  vaciarAlmacenamiento();
  renderizarCarrito();
  notificar("Carrito vaciado", "#6c757d");
}

// ---------- Checkout ----------
async function confirmarCompra() {
  if (!carrito.length) {
    Swal.fire({ icon: "warning", title: "Carrito vacío", text: "Agregá productos antes de confirmar." });
    return;
  }

  const { value: datosCliente } = await Swal.fire({
    title: "Datos de entrega",
    html: `
      <input id="campoNombre" class="swal2-input" placeholder="Nombre y apellido">
      <input id="campoEmail" type="email" class="swal2-input" placeholder="Email">
      <select id="campoEnvio" class="swal2-select">
        <option value="retiro">Retiro en sucursal (sin costo)</option>
        <option value="domicilio">Envío a domicilio (+ $5.000)</option>
      </select>`,
    showCancelButton: true,
    confirmButtonText: "Continuar",
    cancelButtonText: "Cancelar",
    preConfirm: () => {
      const nombre = document.getElementById("campoNombre").value.trim();
      const email = document.getElementById("campoEmail").value.trim();
      const envio = document.getElementById("campoEnvio").value;
      if (!nombre || !email.includes("@")) {
        Swal.showValidationMessage("Completá un nombre y un email válidos");
        return false;
      }
      return { nombre, email, envio };
    }
  });
  if (!datosCliente) return;

  const { nombre, envio } = datosCliente;
  const costoEnvio = envio === "domicilio" ? 5000 : 0;
  const totalFinal = calcularTotal() + costoEnvio;
  const numeroPedido = `TT-${Date.now().toString().slice(-6)}`;

  await Swal.fire({
    icon: "success",
    title: "¡Compra confirmada!",
    html: `<p>Gracias, <b>${nombre}</b>.</p>
           <p>Pedido <b>${numeroPedido}</b> por <b>${formatearPrecio(totalFinal)}</b>.</p>`
  });

  carrito = [];
  vaciarAlmacenamiento();
  renderizarCarrito();
}

// ---------- Eventos ----------
document.addEventListener("click", ({ target }) => {
  const boton = target.closest("[data-accion]");
  if (!boton) return;
  const { accion, id } = boton.dataset;
  const idProducto = Number(id);

  const acciones = {
    agregar: () => agregarAlCarrito(idProducto),
    sumar: () => cambiarCantidad(idProducto, 1),
    restar: () => cambiarCantidad(idProducto, -1),
    quitar: () => quitarDelCarrito(idProducto),
    reintentar: () => iniciarAplicacion()
  };
  acciones[accion]?.();
});

buscador.addEventListener("input", renderizarProductos);
filtroCategoria.addEventListener("change", renderizarProductos);
document.getElementById("botonConfirmar").addEventListener("click", confirmarCompra);
document.getElementById("botonVaciar").addEventListener("click", vaciarCarrito);

// ---------- Inicio ----------
async function iniciarAplicacion() {
  estadoCarga.classList.remove("d-none");
  try {
    catalogo = await cargarProductos();
    llenarCategorias();
    renderizarProductos();
    renderizarCarrito();
  } catch (error) {
    contenedorProductos.innerHTML = `
      <div class="alert alert-danger">
        No pudimos cargar los productos. ${error.message}
        <button class="btn btn-sm btn-outline-danger ms-2" data-accion="reintentar">Reintentar</button>
      </div>`;
  } finally {
    estadoCarga.classList.add("d-none");
  }
}

iniciarAplicacion();
