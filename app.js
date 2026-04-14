let db = []; 
let cart = [];
let tempImages = [];

function navegar(seccion) {
    document.querySelectorAll('section').forEach(s => s.style.display = 'none');
    document.getElementById('vista-' + seccion).style.display = 'block';
    if(seccion === 'tienda') renderTienda();
    if(seccion === 'admin') renderAdmin();
    if(seccion === 'carrito') renderCarrito();
}

// MANEJO DE IMÁGENES
document.getElementById('file-input').addEventListener('change', async function(e) {
    const previewContainer = document.getElementById('file-previews');
    previewContainer.innerHTML = ""; 
    tempImages = []; 
    
    const archivos = Array.from(e.target.files);
    for (const file of archivos) {
        const reader = new FileReader();
        const base64 = await new Promise(resolve => {
            reader.onload = (ev) => resolve(ev.target.result);
            reader.readAsDataURL(file);
        });
        tempImages.push(base64);
        const img = document.createElement('img');
        img.src = base64;
        img.className = 'preview-thumb';
        previewContainer.appendChild(img);
    }
});

// GUARDAR / EDITAR PRODUCTO
// --- LÓGICA DE FORMULARIO UNIFICADA (STOCK + MYSQL) ---
document.getElementById('product-form').onsubmit = async (e) => {
    e.preventDefault();
    
    // 1. CAPTURA DE DATOS (Usando tus IDs reales)
    const idEdit = document.getElementById('edit-id').value;
    const datos = {
        nombre: document.getElementById('name').value,
        precio: parseFloat(document.getElementById('price').value) || 0,
        stock: parseInt(document.getElementById('stock').value) || 0,
        descripcion: document.getElementById('desc').value,
        categoria: "Tecnología", // Como el ejemplo que viste
        imagen_url: "" 
    };

    // 2. VALIDACIÓN (Evita que el código se frene)
    if(!idEdit && tempImages.length < 3) {
        return alert("Por favor selecciona al menos 3 imágenes.");
    }

    try {
        // 3. EL ENVÍO (Usando 'localhost' que es lo que te funcionó)
        const res = await fetch('http://localhost:3000/api/productos/nuevo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        const r = await res.json();

        if(r.success) {
            // 4. ACTUALIZACIÓN VISUAL INMEDIATA
            db.push({ 
                id: r.id_producto, 
                name: datos.nombre, 
                price: datos.precio, 
                stock: datos.stock, 
                desc: datos.descripcion, 
                imgs: [...tempImages] 
            });

            alert("✅ ¡LOGRADO! Guardado en MySQL y visible en Stock.");
            
            resetForm();   // Limpia el formulario
            renderAdmin(); // Refresca la tabla de abajo
        } else {
            alert("❌ Error de MySQL: " + r.error);
        }
    } catch (error) {
        // Si entra aquí, es un problema de red del navegador
        console.error("Error detectado:", error);
        alert("❌ Error: El navegador no pudo enviar los datos. Revisa la consola F12.");
    }
};

// --- FUNCIONES DE APOYO ---
function resetForm() {
    document.getElementById('product-form').reset();
    document.getElementById('edit-id').value = "";
    document.getElementById('file-previews').innerHTML = "";
    document.getElementById('form-title').innerText = "Gestión de Inventario";
    document.getElementById('save-btn').innerText = "GUARDAR PRODUCTO";
    document.getElementById('cancel-btn').style.display = "none";
    tempImages = [];
}

function renderAdmin() {
    const list = document.getElementById('inventory-list');
    if(!list) return;
    list.innerHTML = db.map(p => `
        <tr>
            <td>#${p.id.toString().slice(-4)}</td>
            <td><strong>${p.name}</strong></td>
            <td>${p.stock}</td>
            <td>
                <button onclick="editProduct(${p.id})" style="color:var(--teal); background:none; border:none; cursor:pointer; font-size:1.1rem; margin-right:12px;"><i class="fas fa-edit"></i></button>
                <button onclick="deleteProduct(${p.id})" style="color:red; background:none; border:none; cursor:pointer; font-size:1.1rem;"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function editProduct(id) {
    const p = db.find(x => x.id === id);
    document.getElementById('edit-id').value = p.id;
    document.getElementById('name').value = p.name;
    document.getElementById('price').value = p.price;
    document.getElementById('stock').value = p.stock;
    document.getElementById('desc').value = p.desc;
    document.getElementById('form-title').innerText = "Editando: " + p.name;
    document.getElementById('save-btn').innerText = "ACTUALIZAR CAMBIOS";
    document.getElementById('cancel-btn').style.display = "block";
    navegar('admin');
}

function deleteProduct(id) {
    if(confirm("¿Eliminar producto?")) {
        db = db.filter(p => p.id !== id);
        renderAdmin();
    }
}

// --- TIENDA Y CARRITO ---
function renderTienda() {
    const grid = document.getElementById('grid-productos');
    if(!grid) return;
    grid.innerHTML = db.length === 0 ? '<p>No hay equipos registrados.</p>' : db.map(p => `
        <div class="card">
            <img src="${p.imgs[0]}" onclick="verDetalle(${p.id})">
            <h3>${p.name}</h3>
            <p style="color:var(--teal); font-weight:bold; margin:10px 0;">$${p.price.toLocaleString()}</p>
            <button onclick="addToCart(${p.id})" class="btn-primary" style="padding:10px; font-size:0.8rem">AGREGAR AL CARRITO</button>
        </div>
    `).join('');
}

function verDetalle(id) {
    const p = db.find(x => x.id === id);
    navegar('detalle');
    document.getElementById('det-name').innerText = p.name;
    document.getElementById('det-price').innerText = `$${p.price.toLocaleString()}`;
    document.getElementById('det-desc').innerText = p.desc;
    document.getElementById('main-img').src = p.imgs[0];
    document.getElementById('thumb-container').innerHTML = p.imgs.map(img => `
        <img src="${img}" class="thumb" onclick="document.getElementById('main-img').src='${img}'">
    `).join('');
    document.getElementById('add-to-cart-btn-det').onclick = () => addToCart(p.id);
}

function addToCart(id) {
    const p = db.find(x => x.id === id);
    if (!p) return;
    const item = cart.find(x => x.id === id);
    if (item) {
        item.qty++;
    } else {
        cart.push({ ...p, qty: 1 });
    }
    const contador = document.getElementById('cart-count');
    if (contador) contador.innerText = cart.reduce((a, b) => a + b.qty, 0);
    localStorage.setItem('carrito', JSON.stringify(cart));
    alert("Producto agregado: " + p.name);
}

async function prepararPago() {
    if (cart.length === 0) return alert("El carrito está vacío.");

    // 1. Guardar localmente para la siguiente página
    localStorage.setItem('carrito', JSON.stringify(cart));

    try {
        // 2. Mandar CADA producto del carrito a MySQL
        // Usamos un bucle para recorrer todo el carrito
        for (const item of cart) {
            await fetch('http://localhost:3000/api/carrito/guardar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: 'CLIENTE_' + Date.now(), // Genera un ID único basado en la hora
                    id_producto: item.id,
                    cantidad: item.qty
                })
            });
        }

        // 3. Cuando termine de guardar todo, saltamos a la página de datos del cliente
        window.location.href = 'clientes.html';
        
    } catch (e) {
        // Si el servidor falla, igual lo mandamos al pago usando el localStorage
        console.log("Error en DB, usando copia local...");
        window.location.href = 'clientes.html';
    }
}

// Inicialización
navegar('tienda');
async function cargarProductosDesdeBD() {
    try {
        const res = await fetch('http://localhost:3000/api/productos');
        const productosSQL = await res.json();

        // Convertimos el formato de MySQL al formato que usa tu Stock visual
        db = productosSQL.map(p => ({
            id: p.id_producto,
            name: p.nombre,
            price: parseFloat(p.precio),
            stock: p.stock_actual,
            desc: p.descripcion,
            imgs: [p.imagen_url || 'img/placeholder.jpg', '', ''] // Ajusta según tus fotos
        }));

        renderAdmin(); // Refresca la tabla de Stock
        renderTienda(); // Refresca la vitrina de venta
    } catch (error) {
        console.error("Error cargando productos:", error);
    }
}

// LLAMADA CRÍTICA: Ejecuta esto al final del archivo o en el DOMContentLoaded
cargarProductosDesdeBD();

function renderCarrito() {
    // Buscamos el cuerpo de la tabla (donde van las filas)
    const tabla = document.querySelector('#vista-carrito tbody'); 
    if (!tabla) return;

    tabla.innerHTML = ''; // Limpiamos lo que haya
    let total = 0;

    // Recorremos el carrito (lo que el usuario eligió)
    cart.forEach(item => {
        // IMPORTANTE: Buscamos en 'db' (que ya tiene los datos de MySQL)
        const p = db.find(producto => producto.id == item.id);

        if (p) {
            const subtotal = p.price * item.qty;
            total += subtotal;

            tabla.innerHTML += `
                <tr>
                    <td><img src="${p.imgs[0]}" width="50" style="border-radius:5px;"></td>
                    <td>${p.name}</td>
                    <td>${item.qty}</td>
                    <td>$${subtotal.toLocaleString()}</td>
                    <td>
                        <button onclick="removeFromCart(${p.id})" style="background:red; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:3px;">❌</button>
                    </td>
                </tr>
            `;
        }
    });

// ... (aquí termina tu bucle cart.forEach)

    console.log("Suma total calculada:", total); // Esto es para que veas en la consola si está sumando

    const etiquetaTotal = document.getElementById('txt-total-carrito');
    
    if (etiquetaTotal) {
        etiquetaTotal.innerText = `Total: $${total.toLocaleString()}`;
    } else {
        console.error("No encontré la etiqueta 'txt-total-carrito' en el HTML");
    }
}

// Generamos una llave única para esta sesión de compra
const sessionId = 'SESSION-' + Math.random().toString(36).substr(2, 9);

async function guardarCarritoEnBD() {
    if (cart.length === 0) return;

    try {
        // Enviamos cada producto del carrito a la nueva ruta del servidor
        for (const item of cart) {
            await fetch('http://localhost:3000/api/carrito/guardar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    id_producto: item.id,
                    cantidad: item.qty
                })
            });
        }
        console.log("✅ Carrito sincronizado con MySQL");
    } catch (error) {
        console.error("❌ Error al sincronizar carrito:", error);
    }
}

async function procesarPagoFinal(event) {
    event.preventDefault(); // Evita que la página se recargue

    // Capturamos los datos del formulario
    const datosCliente = {
        nombre: document.getElementById('nom_cliente').value,
        email: document.getElementById('email_cliente').value,
        telefono: document.getElementById('tel_cliente').value,
        direccion: document.getElementById('dir_cliente').value,
        total: totalCalculado // La variable que ya suma bien
    };

    try {
        const response = await fetch('http://localhost:3000/api/ventas/nueva', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosCliente)
        });

        const resultado = await response.json();

        if (resultado.success) {
            alert("¡Compra realizada con éxito! Orden #" + resultado.id_venta);
            cart = []; // Limpiamos el carrito
            localStorage.clear();
            window.location.href = 'index.html'; // Volvemos al inicio
        }
    } catch (error) {
        alert("Hubo un error al procesar la venta");
        console.error(error);
    }
}

async function prepararEnvioYSalir() {
    // 1. Si el carrito está vacío, no hacemos nada
    if (!cart || cart.length === 0) {
        alert("El carrito está vacío, Rodolfo.");
        return;
    }

    // 2. CALCULAMOS EL TOTAL AQUÍ MISMO (Para estar 100% seguros)
    let sumaTotal = 0;
    cart.forEach(item => {
        // Buscamos el precio real en tu base de datos local 'db'
        const p = db.find(producto => producto.id == item.id);
        if (p) {
            sumaTotal += p.price * item.qty;
        }
    });

    // 3. GUARDAMOS EN LA "MEMORIA" DEL NAVEGADOR
    // Esta es la llave que abrirá la puerta en clientes.html
    localStorage.setItem('total_compra', sumaTotal);
    
    console.log("Total calculado y guardado: " + sumaTotal);

    // 4. SALTAMOS AL FORMULARIO
    window.location.href = 'clientes.html';
}

function toggleSidebar() {
    const side = document.getElementById('sidebar');
    // Si la barra está escondida (0px), la pone en 250px. Si no, la esconde.
    if (side.style.width === '250px') {
        side.style.width = '0';
    } else {
        side.style.width = '250px';
    }
}
async function rellenarComboCategorias() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/obtener-categorias');
        const listaCategorias = await respuesta.json();
        
        const combo = document.getElementById('id_categorias');
        
        if (combo) {
            // Limpiamos el "Cargando..." y dejamos una opción inicial
            combo.innerHTML = '<option value="">Seleccione una categoría</option>';
            
            // Recorremos los datos usando tus nombres de campo
            listaCategorias.forEach(cat => {
                const opcion = document.createElement('option');
                opcion.value = cat.id_categorias;        // ID de la base de datos
                opcion.textContent = cat.nombre_categorias; // Nombre visible
                combo.appendChild(opcion);
            });
            console.log("Categorías cargadas correctamente.");
        }
    } catch (error) {
        console.error("No se pudieron cargar las categorías:", error);
    }
}

async function cargarComboCategorias() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/obtener-categorias');
        const categorias = await respuesta.json();
        
        const combo = document.getElementById('id_categorias');
        
        if (combo) {
            // Dejamos el combo limpio con la opción por defecto
            combo.innerHTML = '<option value="">Seleccione una categoría</option>';
            
            // Insertamos cada categoría de la base de datos
            categorias.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.id_categorias;        // El ID
                opt.textContent = cat.nombre_categorias; // El Nombre
                combo.appendChild(opt);
            });
            console.log("✅ Combo de categorías cargado");
        }
    } catch (error) {
        console.error("❌ Error al cargar combo:", error);
    }
}

async function cargarCombo() {
    try {
        const res = await fetch('http://localhost:3000/api/obtener-categorias');
        const data = await res.json();
        const select = document.getElementById('id_categorias');

        if (!select) return;

        select.innerHTML = '<option value="">Seleccione una categoría</option>';

        data.forEach(fila => {
            // Esto es lo más importante: no busca nombres, busca posición
            const columnas = Object.values(fila); 
            const opt = document.createElement('option');
            opt.value = columnas[0];    // El primer dato que encuentre
            opt.textContent = columnas[1]; // El segundo dato
            select.appendChild(opt);
        });
    } catch (err) {
        console.error("Error:", err);
    }
}

// BIEN (Esto te lleva a tu página de registro de cliente)
function prepararEnvioYSalir() {
    if (cart.length === 0) {
        alert("El carrito está vacío.");
        return;
    }

    const total = cart.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

    // Guardamos los datos para que el formulario de cliente los use
    localStorage.setItem('total_compra', total);
    localStorage.setItem('carrito', JSON.stringify(cart));

    // Si tu archivo de registro se llama clientes.html:
    window.location.href = 'clientes.html'; 
    
    // O si el formulario está en el mismo index.html como una sección:
    // navegar('cliente'); 
}

// Función para abrir/cerrar el acordeón
function toggleAccordion(id) {
    const content = document.getElementById(id);
    const arrow = event.currentTarget.querySelector('.arrow');
    
    if (content.style.maxHeight) {
        content.style.maxHeight = null;
        arrow.classList.remove('rotate');
    } else {
        content.style.maxHeight = content.scrollHeight + "px";
        arrow.classList.add('rotate');
    }
}

// Función para cambiar entre secciones (Tienda vs Pedidos)
function mostrarSeccion(id) {
    // Ocultamos todas las secciones principales
    document.getElementById('section-pedidos').style.display = 'none';
    if(document.getElementById('contenedor-productos')) {
        document.getElementById('contenedor-productos').style.display = 'none';
    }
    
    // Mostramos la elegida
    document.getElementById('section-' + id).style.display = 'block';
    toggleSidebar(); // Cerramos el sidebar al elegir una opción
}

// Carga de pedidos desde el servidor
async function cargarPedidosAdmin() {
    try {
        const response = await fetch('http://localhost:3000/api/admin/pedidos');
        const pedidos = await response.json();
        const tbody = document.getElementById('tabla-pedidos-admin');
        tbody.innerHTML = '';

        pedidos.forEach(p => {
            const fecha = new Date(p.fecha).toLocaleDateString();
            tbody.innerHTML += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px;"><strong>${p.codigo_pedido}</strong></td>
                    <td style="padding: 12px;">${p.nombre_cliente}<br><small>${p.telefono}</small></td>
                    <td style="padding: 12px;">${fecha}</td>
                    <td style="padding: 12px;">$${parseFloat(p.total).toLocaleString()}</td>
                    <td style="padding: 12px;">
                        <span class="badge-${p.estado === 'Completado' ? 'success' : 'warning'}">${p.estado}</span>
                    </td>
                    <td style="padding: 12px;">
                        <button onclick="generarDocumento('${p.codigo_pedido}')" style="background: #17a2b8; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
                            <i class="fas fa-print"></i> Orden
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Error:", error);
    }
}
// Ejecutar al cargar
window.addEventListener('DOMContentLoaded', cargarCombo);

window.onload = () => {
    renderTienda(); // La función que ya tenías
    cargarComboCategorias(); // <--- Agregamos esta
};
