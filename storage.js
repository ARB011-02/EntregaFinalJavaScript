const CLAVE_CARRITO = "carritoTiendaTech";

export function obtenerCarrito() {
  return JSON.parse(localStorage.getItem(CLAVE_CARRITO)) || [];
}

export function guardarCarrito(carrito) {
  localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
}

export function borrarCarrito() {
  localStorage.removeItem(CLAVE_CARRITO);
}

export function vaciarAlmacenamiento() {
  localStorage.clear();
}
