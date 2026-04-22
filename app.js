// =====================================================================
//  ARKTECH STORE — app.js
//  Versión actualizada con:
//  ✅ Filtro por categoría corregido
//  ✅ renderTienda() acepta lista filtrada
//  ✅ Módulo de pedidos: estado, guía de envío, comprobante
// =====================================================================

let db = [];
let cart = [];
let tempImages = [];

// ─────────────────────────────────────────────
//  NAVEGACIÓN
// ─────────────────────────────────────────────
function navegar(seccion) {
    // Ocultar todas las secciones
    document.querySelectorAll('section').forEach(s => s.style.display = 'none');

    // 'pedidos' tiene id diferente al patrón 'vista-X'
    if (seccion === 'pedidos') {
        document.getElementById('section-pedidos').style.display = 'block';
        return; // salimos aquí, lo demás no aplica
    }

    const vista = document.getElementById('vista-' + seccion);
    if (vista) vista.style.display = 'block';

    if (seccion === 'tienda') {
        const titulo = document.querySelector('#vista-tienda h1');
        if (titulo) titulo.innerText = 'Nuestros Productos';
        renderTienda();
    }
    if (seccion === 'admin')   renderAdmin();
    if (seccion === 'carrito') renderCarrito();
}

// ─────────────────────────────────────────────
//  SIDEBAR
// ─────────────────────────────────────────────
function toggleSidebar() {
    const side = document.getElementById('sidebar');
    side.style.width = (side.style.width === '250px') ? '0' : '250px';
}

function toggleAdmin() {
    const caja   = document.getElementById('menu-admin-box');
    const flecha = document.getElementById('flecha-admin');
    if (caja.style.maxHeight && caja.style.maxHeight !== '0px') {
        caja.style.maxHeight = '0px';
        flecha.style.transform = 'rotate(0deg)';
    } else {
        caja.style.maxHeight = caja.scrollHeight + 'px';
        flecha.style.transform = 'rotate(180deg)';
    }
}

function toggleCategorias() {
    const caja   = document.getElementById('menu-cat-box');
    const flecha = document.getElementById('flecha-cat');
    if (caja.style.maxHeight && caja.style.maxHeight !== '0px') {
        caja.style.maxHeight = '0px';
        flecha.style.transform = 'rotate(0deg)';
    } else {
        caja.style.maxHeight = caja.scrollHeight + 'px';
        flecha.style.transform = 'rotate(180deg)';
    }
}

// ─────────────────────────────────────────────
//  MANEJO DE IMÁGENES (subida)
// ─────────────────────────────────────────────
document.getElementById('file-input').addEventListener('change', async function (e) {
    const previewContainer = document.getElementById('file-previews');
    previewContainer.innerHTML = '';
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

// ─────────────────────────────────────────────
//  GUARDAR / EDITAR PRODUCTO
// ─────────────────────────────────────────────
document.getElementById('product-form').onsubmit = async (e) => {
    e.preventDefault();

    const idEdit = document.getElementById('edit-id').value;
    const datos = {
        nombre:      document.getElementById('name').value,
        precio:      parseFloat(document.getElementById('price').value) || 0,
        stock:       parseInt(document.getElementById('stock').value) || 0,
        descripcion: document.getElementById('desc').value,
        categoria:   document.getElementById('id_categorias').value,
        imagen_url:  tempImages[0]
    };

    const urlApi = idEdit
        ? `http://localhost:3000/api/productos/editar/${idEdit}`
        : 'http://localhost:3000/api/productos/nuevo';
    const metodo = idEdit ? 'PUT' : 'POST';

    try {
        const res = await fetch(urlApi, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
        const r = await res.json();

        if (r.success) {
            if (idEdit) {
                const index = db.findIndex(p => p.id == idEdit);
                if (index !== -1) {
                    db[index] = {
                        ...db[index],
                        name:        datos.nombre,
                        price:       datos.precio,
                        stock:       datos.stock,
                        desc:        datos.descripcion,
                        id_categoria: datos.categoria,
                        imgs:        tempImages.length > 0 ? [...tempImages] : db[index].imgs
                    };
                }
                alert('✅ Producto actualizado correctamente.');
            } else {
                db.push({
                    id:    r.id_producto,
                    name:  datos.nombre,
                    price: datos.precio,
                    stock: datos.stock,
                    desc:  datos.descripcion,
                    imgs:  [...tempImages],
                    id_categoria: datos.categoria
                });
                alert('✅ Producto nuevo guardado.');
            }
            resetForm();
            renderAdmin();
            renderTienda();
        } else {
            alert('❌ Error de MySQL: ' + r.error);
        }
    } catch (error) {
        alert('❌ Error: El servidor no respondió.');
    }
};

// ─────────────────────────────────────────────
//  RESET FORMULARIO
// ─────────────────────────────────────────────
function resetForm() {
    document.getElementById('product-form').reset();
    document.getElementById('edit-id').value = '';
    document.getElementById('file-previews').innerHTML = '';
    document.getElementById('form-title').innerText = 'Gestión de Inventario';
    document.getElementById('save-btn').innerText = 'GUARDAR PRODUCTO';
    const cancelBtn = document.getElementById('cancel-btn');
    if (cancelBtn) cancelBtn.style.display = 'none';
    tempImages = [];
}

// ─────────────────────────────────────────────
//  INVENTARIO ADMIN
// ─────────────────────────────────────────────
function renderAdmin() {
    const list = document.getElementById('inventory-list');
    if (!list) return;
    list.innerHTML = db.map(p => `
        <tr>
            <td>#${p.id.toString().slice(-4)}</td>
            <td><strong>${p.name}</strong></td>
            <td>${p.stock}</td>
            <td>
                <button onclick="editProduct(${p.id})" style="color:var(--teal); background:none; border:none; cursor:pointer; font-size:1.1rem; margin-right:12px;">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteProduct(${p.id})" style="color:red; background:none; border:none; cursor:pointer; font-size:1.1rem;">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function editProduct(id) {
    const p = db.find(x => x.id === id);
    if (!p) return;
    document.getElementById('edit-id').value  = p.id;
    document.getElementById('name').value     = p.name;
    document.getElementById('price').value    = p.price;
    document.getElementById('stock').value    = p.stock;
    document.getElementById('desc').value     = p.desc;
    document.getElementById('form-title').innerText  = 'Editando: ' + p.name;
    document.getElementById('save-btn').innerText    = 'ACTUALIZAR CAMBIOS';
    const cancelBtn = document.getElementById('cancel-btn');
    if (cancelBtn) cancelBtn.style.display = 'block';
    navegar('admin');
}

async function deleteProduct(id) {
    if (!confirm('¿Estás seguro de eliminar este producto de la base de datos?')) return;
    try {
        const res = await fetch(`http://localhost:3000/api/productos/eliminar/${id}`, { method: 'DELETE' });
        const r   = await res.json();
        if (r.success) {
            db = db.filter(p => p.id !== id);
            renderAdmin();
            renderTienda();
            alert('✅ Eliminado permanentemente.');
        } else {
            alert('❌ Error: ' + r.error);
        }
    } catch (error) {
        alert('❌ No se pudo conectar con el servidor.');
    }
}

// ─────────────────────────────────────────────
//  TIENDA — renderTienda acepta lista filtrada
// ─────────────────────────────────────────────
function renderTienda(lista) {
    const grid = document.getElementById('grid-productos');
    if (!grid) return;
    const productos = lista || db;
    grid.innerHTML = productos.length === 0
        ? '<p style="text-align:center; padding:40px;">No hay productos en esta categoría.</p>'
        : productos.map(p => `
            <div class="card">
                <img src="${p.imgs[0]}" onclick="verDetalle(${p.id})" style="cursor:pointer;">
                <h3>${p.name}</h3>
                <p style="color:var(--teal); font-weight:bold; margin:10px 0;">$${p.price.toLocaleString()}</p>
                <button onclick="addToCart(${p.id})" class="btn-primary" style="padding:10px; font-size:0.8rem">AGREGAR AL CARRITO</button>
            </div>
        `).join('');
}

// ─────────────────────────────────────────────
//  FILTRO POR CATEGORÍA — corregido
// ─────────────────────────────────────────────
function filtrarPorCategoria(idCat, nombreCat) {
    navegar('tienda');
    const titulo = document.querySelector('#vista-tienda h1');
    if (titulo) titulo.innerText = 'Categoría: ' + nombreCat;
    // Comparamos como String para evitar errores entre número y texto
    const filtrados = db.filter(p => String(p.id_categoria) === String(idCat));
    renderTienda(filtrados);
    toggleSidebar();
}

// ─────────────────────────────────────────────
//  FILTRAR DESDE BARRA DE BÚSQUEDA
// ─────────────────────────────────────────────
function filtrarProductos() {
    const texto = document.getElementById('input-busqueda').value.toLowerCase();
    const filtrados = db.filter(p => p.name.toLowerCase().includes(texto));
    renderTienda(filtrados);
}

// ─────────────────────────────────────────────
//  DETALLE DE PRODUCTO
// ─────────────────────────────────────────────
function verDetalle(id) {
    const p = db.find(x => x.id === id);
    if (!p) return;
    navegar('detalle');
    document.getElementById('det-name').innerText  = p.name;
    document.getElementById('det-price').innerText = `$${p.price.toLocaleString()}`;
    document.getElementById('det-desc').innerText  = p.desc;
    document.getElementById('main-img').src        = p.imgs[0];
    document.getElementById('thumb-container').innerHTML = p.imgs.map(img => `
        <img src="${img}" class="thumb" onclick="document.getElementById('main-img').src='${img}'">
    `).join('');
    document.getElementById('add-to-cart-btn-det').onclick = () => addToCart(p.id);
}

// ─────────────────────────────────────────────
//  CARRITO
// ─────────────────────────────────────────────
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
    alert('Producto agregado: ' + p.name);
}

function removeFromCart(id) {
    cart = cart.filter(x => x.id !== id);
    const contador = document.getElementById('cart-count');
    if (contador) contador.innerText = cart.reduce((a, b) => a + b.qty, 0);
    renderCarrito();
}

function renderCarrito() {
    const tabla = document.querySelector('#vista-carrito tbody');
    if (!tabla) return;
    tabla.innerHTML = '';
    let total = 0;

    cart.forEach(item => {
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

    const etiquetaTotal = document.getElementById('txt-total-carrito');
    if (etiquetaTotal) etiquetaTotal.innerText = `Total: $${total.toLocaleString()}`;
}

// ─────────────────────────────────────────────
//  FINALIZAR COMPRA
// ─────────────────────────────────────────────
async function prepararEnvioYSalir() {
    if (!cart || cart.length === 0) {
        alert('El carrito está vacío.');
        return;
    }
    let sumaTotal = 0;
    cart.forEach(item => {
        const p = db.find(producto => producto.id == item.id);
        if (p) sumaTotal += p.price * item.qty;
    });
    localStorage.setItem('total_compra', sumaTotal);
    localStorage.setItem('carrito', JSON.stringify(cart));
    window.location.href = 'clientes.html';
}

// ─────────────────────────────────────────────
//  FORMULARIO DE CLIENTE (finalizar pedido)
// ─────────────────────────────────────────────
const formCliente = document.getElementById('form-cliente');
if (formCliente) {
    formCliente.onsubmit = async (e) => {
        e.preventDefault();
        const datosPedido = {
            nombre_cliente: document.getElementById('cliente-nombre').value,
            documento:      document.getElementById('cliente-id').value,
            telefono:       document.getElementById('cliente-tel').value,
            email:          document.getElementById('cliente-email').value,
            direccion:      document.getElementById('cliente-dir').value,
            carrito:        cart,
            total:          cart.reduce((sum, item) => {
                                const p = db.find(x => x.id == item.id);
                                return sum + (p ? p.price * item.qty : 0);
                            }, 0)
        };

        try {
            const res = await fetch('http://localhost:3000/api/crear-pedido', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosPedido)
            });
            const r = await res.json();
            if (r.success) {
                alert(`✅ ¡Pedido registrado! Tu número de orden es: ${r.orden}`);
                cart = [];
                localStorage.clear();
                navegar('tienda');
            } else {
                alert('❌ Error al guardar el pedido: ' + r.error);
            }
        } catch (error) {
            console.error('Error en la compra:', error);
            alert('❌ No se pudo conectar con el servidor.');
        }
    };
}

// ─────────────────────────────────────────────
//  CARGA INICIAL DE PRODUCTOS DESDE BD
// ─────────────────────────────────────────────
async function cargarProductosDesdeBD() {
    try {
        const res = await fetch('http://localhost:3000/api/productos');
        const productosSQL = await res.json();
        db = productosSQL.map(p => ({
            id:          p.id_producto,
            name:        p.nombre,
            price:       parseFloat(p.precio),
            stock:       p.stock_actual,
            desc:        p.descripcion,
            imgs:        [p.imagen_url || 'https://via.placeholder.com/150'],
            id_categoria: p.id_categorias || p.categoria
        }));
        renderAdmin();
        renderTienda();
    } catch (error) {
        console.error('Error cargando productos:', error);
    }
}

// ─────────────────────────────────────────────
//  CATEGORÍAS — sidebar y combo del formulario
// ─────────────────────────────────────────────
async function cargarCategoriasSidebar() {
    try {
        const res       = await fetch('http://localhost:3000/api/obtener-categorias');
        const categorias = await res.json();
        const menuLateral = document.getElementById('menu-cat-box');
        if (menuLateral) {
            menuLateral.innerHTML = categorias.map(cat => `
                <a href="#" onclick="filtrarPorCategoria(${cat.id_categorias}, '${cat.nombre_categorias}')">
                    <i class="fas fa-chevron-right"></i> ${cat.nombre_categorias}
                </a>
            `).join('');
        }
    } catch (e) {
        console.error('Error cargando categorías sidebar:', e);
    }
}

async function cargarComboCategorias() {
    try {
        const res       = await fetch('http://localhost:3000/api/obtener-categorias');
        const categorias = await res.json();
        const combo      = document.getElementById('id_categorias');
        if (combo) {
            combo.innerHTML = '<option value="">Seleccione una categoría</option>';
            categorias.forEach(cat => {
                const opt = document.createElement('option');
                opt.value       = cat.id_categorias;
                opt.textContent = cat.nombre_categorias;
                combo.appendChild(opt);
            });
        }
    } catch (error) {
        console.error('Error al cargar combo de categorías:', error);
    }
}

// ─────────────────────────────────────────────
//  MÓDULO DE PEDIDOS — ADMINISTRADOR
// ─────────────────────────────────────────────

let pedidoEnModal = null;

async function cargarPedidosAdmin() {
    try {
        const response = await fetch('http://localhost:3000/api/admin/pedidos');
        const pedidos  = await response.json();
        const tbody    = document.getElementById('tabla-pedidos-admin');
        if (!tbody) return;

        actualizarContadoresPedidos(pedidos);
        window._pedidosAdmin = pedidos;

        tbody.innerHTML = '';
        pedidos.forEach(p => {
            const fecha = new Date(p.fecha).toLocaleDateString('es-CO');
            const guiaNum   = (p.numero_guia   || '').replace(/'/g, "\\'");
            const guiaTrans = (p.transportadora || '').replace(/'/g, "\\'");
            tbody.innerHTML += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px;">
                        <strong style="color:#20b2aa;">${p.codigo_pedido || '—'}</strong>
                    </td>
                    <td style="padding: 12px;">
                        ${p.nombre_cliente || '—'}<br>
                        <small style="color:#888;">${p.telefono || ''}</small>
                    </td>
                    <td style="padding: 12px; font-size:0.85rem; color:#555;">${fecha}</td>
                    <td style="padding: 12px; font-weight:bold;">
                        $${parseFloat(p.total).toLocaleString()}
                    </td>
                    <td style="padding: 12px;">
                        ${badgePedido(p.estado)}
                        <select
                            onchange="cambiarEstadoPedido(${p.id_pedido}, this.value)"
                            style="margin-top:6px; width:100%; padding:4px 6px; border-radius:6px; border:1px solid #ddd; font-size:0.8rem; cursor:pointer;">
                            <option value="Pendiente" ${p.estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                            <option value="En camino" ${p.estado === 'En camino' ? 'selected' : ''}>En camino</option>
                            <option value="Entregado" ${p.estado === 'Entregado' ? 'selected' : ''}>Entregado</option>
                        </select>
                    </td>
                    <td style="padding: 12px; font-size:0.82rem;">
                        ${p.numero_guia
                            ? `<span style="color:#20b2aa; font-weight:bold;">${p.numero_guia}</span><br>
                               <small>${p.transportadora || ''}</small>`
                            : '<span style="color:#aaa;">Sin guía</span>'
                        }
                    </td>
                    <td style="padding: 12px;">
                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                            <button onclick="abrirModalGuia(${p.id_pedido}, '${guiaNum}', '${guiaTrans}')"
                                title="Adjuntar guía"
                                style="background:#17a2b8; color:white; border:none; padding:5px 9px; border-radius:5px; cursor:pointer; font-size:0.8rem;">
                                <i class="fas fa-truck"></i> Guía
                            </button>
                            <button onclick="verComprobantePedido(${p.id_pedido})"
                                title="Ver comprobante"
                                style="background:#6c757d; color:white; border:none; padding:5px 9px; border-radius:5px; cursor:pointer; font-size:0.8rem;">
                                <i class="fas fa-file-alt"></i> Comprobante
                            </button>
                            <button onclick="eliminarPedido(${p.id_pedido}, '${p.codigo_pedido}')"
                                title="Eliminar pedido"
                                style="background:#dc3545; color:white; border:none; padding:5px 9px; border-radius:5px; cursor:pointer; font-size:0.8rem;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

    } catch (error) {
        console.error('Error cargando pedidos:', error);
        Swal.fire('Error', 'No se pudieron cargar los pedidos del servidor.', 'error');
    }
}

// ── Eliminar pedido ───────────────────────────────────────────────────
async function eliminarPedido(idPedido, codigoPedido) {
    const confirmacion = await Swal.fire({
        title: '¿Eliminar pedido?',
        html: `El pedido <strong>${codigoPedido}</strong> será eliminado permanentemente.<br><br>Esta acción no se puede deshacer.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    try {
        const res = await fetch(`http://localhost:3000/api/pedidos/eliminar/${idPedido}`, {
            method: 'DELETE'
        });
        const r = await res.json();
        if (r.success) {
            Swal.fire({ icon: 'success', title: 'Pedido eliminado', timer: 1500, showConfirmButton: false });
            cargarPedidosAdmin();
        } else {
            Swal.fire('Error', 'No se pudo eliminar: ' + r.error, 'error');
        }
    } catch (error) {
        Swal.fire('Error', 'No se pudo conectar con el servidor.', 'error');
    }
}

// Devuelve el HTML del badge según el estado
function badgePedido(estado) {
    const estilos = {
        'Pendiente':  'background:#fff3cd; color:#856404; border:1px solid #ffc107;',
        'En camino':  'background:#cff4fc; color:#055160; border:1px solid #0dcaf0;',
        'Entregado':  'background:#d1e7dd; color:#0a3622; border:1px solid #198754;'
    };
    const estilo = estilos[estado] || 'background:#eee; color:#333;';
    return `<span style="display:inline-block; padding:3px 10px; border-radius:20px; font-size:0.75rem; font-weight:600; ${estilo}">${estado || 'Sin estado'}</span>`;
}

// Actualiza los contadores del resumen (si tienes elementos con esos IDs en el HTML)
function actualizarContadoresPedidos(pedidos) {
    const totalEl    = document.getElementById('contador-total-pedidos');
    const pendEl     = document.getElementById('contador-pendientes');
    const transitoEl = document.getElementById('contador-en-camino');
    const entregEl   = document.getElementById('contador-entregados');

    if (totalEl)    totalEl.innerText    = pedidos.length;
    if (pendEl)     pendEl.innerText     = pedidos.filter(p => p.estado === 'Pendiente').length;
    if (transitoEl) transitoEl.innerText = pedidos.filter(p => p.estado === 'En camino').length;
    if (entregEl)   entregEl.innerText   = pedidos.filter(p => p.estado === 'Entregado').length;
}

// ── Cambiar estado de un pedido y guardarlo en MySQL ──────────────────
async function cambiarEstadoPedido(idPedido, nuevoEstado) {
    try {
        const res = await fetch(`http://localhost:3000/api/pedidos/estado/${idPedido}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: nuevoEstado })
        });
        const r = await res.json();
        if (r.success) {
            Swal.fire({ icon: 'success', title: 'Estado actualizado', text: nuevoEstado, timer: 1500, showConfirmButton: false });
            cargarPedidosAdmin(); // Recarga la tabla para reflejar el cambio
        } else {
            Swal.fire('Error', 'No se pudo actualizar el estado: ' + r.error, 'error');
        }
    } catch (error) {
        console.error('Error actualizando estado:', error);
        Swal.fire('Error', 'No se pudo conectar con el servidor.', 'error');
    }
}

// ── Modal: adjuntar guía de envío ─────────────────────────────────────
function abrirModalGuia(idPedido, guiaActual, transportadoraActual) {
    pedidoEnModal = idPedido;
    Swal.fire({
        title: '<i class="fas fa-truck"></i> Guía de envío',
        html: `
            <div style="text-align:left;">
                <label style="font-weight:bold; display:block; margin-bottom:4px;">Número de guía</label>
                <input id="swal-guia-num" class="swal2-input" placeholder="Ej: TCC-2025-98321" value="${guiaActual}" style="margin-bottom:12px;">

                <label style="font-weight:bold; display:block; margin-bottom:4px;">Transportadora</label>
                <input id="swal-transportadora" class="swal2-input" placeholder="Ej: TCC, Servientrega, Coordinadora..." value="${transportadoraActual}" style="margin-bottom:12px;">

                <label style="font-weight:bold; display:block; margin-bottom:4px;">Archivo de guía (PDF o imagen)</label>
                <input id="swal-guia-file" type="file" accept=".pdf,image/*" class="swal2-file" style="margin-top:4px;">
            </div>
        `,
        confirmButtonText: 'Guardar guía',
        confirmButtonColor: '#20b2aa',
        cancelButtonText: 'Cancelar',
        showCancelButton: true,
        preConfirm: () => {
            const num   = document.getElementById('swal-guia-num').value.trim();
            const trans = document.getElementById('swal-transportadora').value.trim();
            if (!num || !trans) {
                Swal.showValidationMessage('Completa el número de guía y la transportadora.');
                return false;
            }
            return { numero_guia: num, transportadora: trans };
        }
    }).then(result => {
        if (result.isConfirmed) {
            guardarGuiaPedido(pedidoEnModal, result.value.numero_guia, result.value.transportadora);
        }
    });
}

// Envía la guía al servidor
async function guardarGuiaPedido(idPedido, numero_guia, transportadora) {
    try {
        const res = await fetch(`http://localhost:3000/api/pedidos/guia/${idPedido}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ numero_guia, transportadora })
        });
        const r = await res.json();
        if (r.success) {
            Swal.fire({ icon: 'success', title: '¡Guía guardada!', text: `${numero_guia} — ${transportadora}`, timer: 2000, showConfirmButton: false });
            cargarPedidosAdmin();
        } else {
            Swal.fire('Error', 'No se pudo guardar la guía: ' + r.error, 'error');
        }
    } catch (error) {
        console.error('Error guardando guía:', error);
        Swal.fire('Error', 'No se pudo conectar con el servidor.', 'error');
    }
}

// ── Ver comprobante (vista previa rápida en modal) ────────────────────
function verComprobantePedido(idPedido) {
    if (!window._pedidosAdmin) return;
    const p = window._pedidosAdmin.find(x => x.id_pedido === idPedido);
    if (!p) return;

    const fecha = new Date(p.fecha).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    const totalBruto = parseFloat(p.total);
    const iva        = +(totalBruto * 0.19).toFixed(0);
    const subtotal   = +(totalBruto - iva).toFixed(0);

    Swal.fire({
        title: `Comprobante de venta — ${p.codigo_pedido || '—'}`,
        html: `
            <table style="width:100%; text-align:left; font-size:0.88rem; border-collapse:collapse;">
                <tr style="background:#f0fafa;">
                    <td colspan="2" style="padding:8px 10px; font-weight:bold; color:#20b2aa; font-size:0.95rem;">
                        Datos del vendedor
                    </td>
                </tr>
                <tr><td style="padding:6px 10px; color:#888; width:45%;">Razón social</td><td style="padding:6px 10px;">Arktech Store</td></tr>
                <tr style="border-bottom:1px solid #eee;"><td style="padding:6px 10px; color:#888;">NIT</td><td style="padding:6px 10px;">— (pendiente registro)</td></tr>

                <tr style="background:#f0fafa;">
                    <td colspan="2" style="padding:8px 10px; font-weight:bold; color:#20b2aa; font-size:0.95rem;">
                        Datos del comprador
                    </td>
                </tr>
                <tr><td style="padding:6px 10px; color:#888;">Nombre</td><td style="padding:6px 10px; font-weight:bold;">${p.nombre_cliente || '—'}</td></tr>
                <tr><td style="padding:6px 10px; color:#888;">Documento</td><td style="padding:6px 10px;">${p.documento_cliente || '—'}</td></tr>
                <tr><td style="padding:6px 10px; color:#888;">Teléfono</td><td style="padding:6px 10px;">${p.telefono || '—'}</td></tr>
                <tr><td style="padding:6px 10px; color:#888;">Email</td><td style="padding:6px 10px;">${p.email || '—'}</td></tr>
                <tr style="border-bottom:1px solid #eee;"><td style="padding:6px 10px; color:#888;">Dirección entrega</td><td style="padding:6px 10px;">${p.direccion || '—'}</td></tr>

                <tr style="background:#f0fafa;">
                    <td colspan="2" style="padding:8px 10px; font-weight:bold; color:#20b2aa; font-size:0.95rem;">
                        Datos del pedido
                    </td>
                </tr>
                <tr><td style="padding:6px 10px; color:#888;">N° de orden</td><td style="padding:6px 10px; font-weight:bold; color:#20b2aa;">${p.codigo_pedido || '—'}</td></tr>
                <tr><td style="padding:6px 10px; color:#888;">Fecha</td><td style="padding:6px 10px;">${fecha}</td></tr>
                <tr><td style="padding:6px 10px; color:#888;">Forma de pago</td><td style="padding:6px 10px;">Pago electrónico (ePayco)</td></tr>
                <tr><td style="padding:6px 10px; color:#888;">Estado</td><td style="padding:6px 10px;">${badgePedido(p.estado)}</td></tr>
                ${p.numero_guia ? `<tr><td style="padding:6px 10px; color:#888;">Guía envío</td><td style="padding:6px 10px;">${p.numero_guia} (${p.transportadora})</td></tr>` : ''}

                <tr style="background:#f0fafa;">
                    <td colspan="2" style="padding:8px 10px; font-weight:bold; color:#20b2aa; font-size:0.95rem;">
                        Valores
                    </td>
                </tr>
                <tr><td style="padding:6px 10px; color:#888;">Subtotal (sin IVA)</td><td style="padding:6px 10px;">$${subtotal.toLocaleString()}</td></tr>
                <tr><td style="padding:6px 10px; color:#888;">IVA (19%)</td><td style="padding:6px 10px;">$${iva.toLocaleString()}</td></tr>
                <tr style="border-top:2px solid #20b2aa;">
                    <td style="padding:8px 10px; font-weight:bold;">TOTAL PAGADO</td>
                    <td style="padding:8px 10px; font-weight:bold; color:#20b2aa; font-size:1.1rem;">$${totalBruto.toLocaleString()}</td>
                </tr>
            </table>
        `,
        confirmButtonText: '⬇ Descargar / Imprimir',
        confirmButtonColor: '#20b2aa',
        cancelButtonText: 'Cerrar',
        showCancelButton: true,
        width: 560
    }).then(result => {
        if (result.isConfirmed) descargarComprobantePDF(p);
    });
}

// ── Generar PDF completo con QR ───────────────────────────────────────
function descargarComprobantePDF(p) {
    const fecha     = new Date(p.fecha).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    const horaExped = new Date(p.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    const totalBruto = parseFloat(p.total);
    const iva        = +(totalBruto * 0.19).toFixed(0);
    const subtotal   = +(totalBruto - iva).toFixed(0);

    // Texto que codifica el QR — datos clave del pedido
    const qrData = encodeURIComponent(
        `ARKTECH STORE\nOrden: ${p.codigo_pedido}\nCliente: ${p.nombre_cliente}\nDoc: ${p.documento_cliente}\nTotal: $${totalBruto.toLocaleString()}\nFecha: ${fecha}\nEstado: ${p.estado}`
    );
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrData}`;

    const ventana = window.open('', '_blank');
    ventana.document.write(`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Comprobante ${p.codigo_pedido}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 13px; color: #333; background: #f5f5f5; }
        .page { background: white; max-width: 700px; margin: 30px auto; padding: 40px; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }

        /* ENCABEZADO */
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #20b2aa; padding-bottom: 20px; margin-bottom: 20px; }
        .logo-text { font-size: 28px; font-weight: bold; color: #1a252f; }
        .logo-text span { color: #20b2aa; }
        .empresa-info { font-size: 11px; color: #666; margin-top: 4px; line-height: 1.6; }
        .doc-info { text-align: right; }
        .doc-titulo { font-size: 18px; font-weight: bold; color: #20b2aa; }
        .doc-num { font-size: 22px; font-weight: bold; color: #1a252f; }
        .doc-fecha { font-size: 11px; color: #666; margin-top: 4px; }

        /* ALERTA DOCUMENTO INTERNO */
        .aviso { background: #fff8e1; border-left: 4px solid #ffc107; padding: 8px 12px; margin-bottom: 18px; font-size: 11px; color: #856404; border-radius: 0 4px 4px 0; }

        /* SECCIONES */
        .seccion-titulo { background: #1a252f; color: white; padding: 6px 12px; font-size: 11px; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 16px; margin-bottom: 0; border-radius: 4px 4px 0 0; }
        .seccion-body { border: 1px solid #ddd; border-top: none; border-radius: 0 0 4px 4px; }
        .fila { display: flex; border-bottom: 1px solid #f0f0f0; }
        .fila:last-child { border-bottom: none; }
        .fila-label { width: 38%; padding: 7px 12px; color: #888; background: #fafafa; font-size: 11px; }
        .fila-valor { flex: 1; padding: 7px 12px; font-weight: 500; font-size: 12px; }

        /* TABLA DE VALORES */
        .valores { width: 100%; border-collapse: collapse; margin-top: 16px; }
        .valores td { padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 12px; }
        .valores td:last-child { text-align: right; font-weight: 500; }
        .valores .total-row td { border-top: 2px solid #20b2aa; font-weight: bold; font-size: 14px; color: #20b2aa; padding-top: 12px; }

        /* FOOTER CON QR */
        .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
        .footer-texto { font-size: 10px; color: #aaa; line-height: 1.8; max-width: 400px; }
        .footer-texto strong { color: #555; }
        .qr-bloque { text-align: center; }
        .qr-bloque img { width: 100px; height: 100px; border: 1px solid #ddd; border-radius: 4px; }
        .qr-label { font-size: 9px; color: #aaa; margin-top: 4px; }

        /* ESTADO BADGE */
        .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; }
        .badge-Pendiente { background: #fff3cd; color: #856404; }
        .badge-En.camino { background: #cff4fc; color: #055160; }
        .badge-Entregado { background: #d1e7dd; color: #0a3622; }

        @media print {
            body { background: white; }
            .page { box-shadow: none; margin: 0; border-radius: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
<div class="page">

    <!-- ENCABEZADO -->
    <div class="header">
        <div>
            <div class="logo-text">Arktech<span>Store</span></div>
            <div class="empresa-info">
                Tienda virtual de tecnología<br>
                NIT: — (pendiente de registro)<br>
                Régimen: Régimen Simple / No responsable de IVA<br>
                Cartagena, Colombia
            </div>
        </div>
        <div class="doc-info">
            <div class="doc-titulo">COMPROBANTE DE VENTA</div>
            <div class="doc-num">${p.codigo_pedido || '—'}</div>
            <div class="doc-fecha">Fecha: ${fecha} · ${horaExped} hrs</div>
        </div>
    </div>

    <!-- AVISO -->
    <div class="aviso">
        ⚠ Este documento es un <strong>comprobante interno de pedido</strong>. No reemplaza la factura electrónica de venta exigida por la DIAN. La factura oficial será emitida por el proveedor de facturación electrónica autorizado.
    </div>

    <!-- DATOS DEL VENDEDOR -->
    <div class="seccion-titulo">Datos del vendedor</div>
    <div class="seccion-body">
        <div class="fila"><div class="fila-label">Razón social</div><div class="fila-valor">Arktech Store</div></div>
        <div class="fila"><div class="fila-label">NIT</div><div class="fila-valor">— (pendiente)</div></div>
        <div class="fila"><div class="fila-label">Dirección</div><div class="fila-valor">Cartagena, Colombia</div></div>
        <div class="fila"><div class="fila-label">Responsable de IVA</div><div class="fila-valor">No responsable</div></div>
    </div>

    <!-- DATOS DEL COMPRADOR -->
    <div class="seccion-titulo">Datos del comprador (adquiriente)</div>
    <div class="seccion-body">
        <div class="fila"><div class="fila-label">Nombre / Razón social</div><div class="fila-valor"><strong>${p.nombre_cliente || '—'}</strong></div></div>
        <div class="fila"><div class="fila-label">Documento (C.C. / NIT)</div><div class="fila-valor">${p.documento_cliente || '—'}</div></div>
        <div class="fila"><div class="fila-label">Teléfono</div><div class="fila-valor">${p.telefono || '—'}</div></div>
        <div class="fila"><div class="fila-label">Email</div><div class="fila-valor">${p.email || '—'}</div></div>
        <div class="fila"><div class="fila-label">Dirección de entrega</div><div class="fila-valor">${p.direccion || '—'}</div></div>
    </div>

    <!-- DATOS DEL PEDIDO -->
    <div class="seccion-titulo">Datos del pedido</div>
    <div class="seccion-body">
        <div class="fila"><div class="fila-label">N° de orden consecutivo</div><div class="fila-valor"><strong style="color:#20b2aa;">${p.codigo_pedido || '—'}</strong></div></div>
        <div class="fila"><div class="fila-label">Fecha y hora de expedición</div><div class="fila-valor">${fecha} — ${horaExped} hrs</div></div>
        <div class="fila"><div class="fila-label">Forma de pago</div><div class="fila-valor">Pago electrónico (ePayco)</div></div>
        <div class="fila"><div class="fila-label">Estado del pedido</div><div class="fila-valor"><span class="badge badge-${p.estado}">${p.estado || '—'}</span></div></div>
        ${p.numero_guia ? `
        <div class="fila"><div class="fila-label">Guía de envío</div><div class="fila-valor">${p.numero_guia} — ${p.transportadora}</div></div>
        ` : ''}
    </div>

    <!-- VALORES -->
    <table class="valores">
        <tr><td>Subtotal (sin IVA incluido)</td><td>$${subtotal.toLocaleString()}</td></tr>
        <tr><td>IVA (19%) — discriminado</td><td>$${iva.toLocaleString()}</td></tr>
        <tr class="total-row"><td>TOTAL PAGADO</td><td>$${totalBruto.toLocaleString()}</td></tr>
    </table>

    <!-- FOOTER CON QR -->
    <div class="footer">
        <div class="footer-texto">
            <strong>Arktech Store</strong><br>
            Conserve este comprobante como soporte de su compra.<br>
            Para reclamaciones comuníquese por WhatsApp o email.<br><br>
            <em>Documento generado el ${new Date().toLocaleDateString('es-CO')} — Arktech Store © ${new Date().getFullYear()}</em>
        </div>
        <div class="qr-bloque">
            <img src="${qrUrl}" alt="QR del pedido" onerror="this.style.display='none'">
            <div class="qr-label">Escanea para verificar<br>el pedido ${p.codigo_pedido}</div>
        </div>
    </div>

</div>
<script>window.onload = () => window.print();<\/script>
</body>
</html>
    `);
    ventana.document.close();
}

// ─────────────────────────────────────────────
//  INICIALIZACIÓN
// ─────────────────────────────────────────────
navegar('tienda');

window.onload = () => {
    cargarProductosDesdeBD();
    cargarComboCategorias();
    cargarCategoriasSidebar();
};