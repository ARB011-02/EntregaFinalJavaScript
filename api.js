const RUTA_PRODUCTOS = "./data/productos.json";

export async function cargarProductos() {
  const respuesta = await fetch(RUTA_PRODUCTOS);
  if (!respuesta.ok) {
    throw new Error(`No se pudo leer el catálogo (HTTP ${respuesta.status})`);
  }
  return respuesta.json();
}
