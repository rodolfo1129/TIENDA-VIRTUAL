// 1. Estado de la Aplicación
let productos = [
    { id: 1, nombre: "Laptop Arktech Pro", precio: 1250, stock: 5, img: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500" },
    { id: 2, nombre: "Monitor UltraWide 34", precio: 450, stock: 8, img: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500" }
];
let carrito = [];

// 2. Navegación
function mostrarSeccion(seccion) {
    document.getElementById('seccion-tienda').style.display = seccion === 'tienda' ? 'block' : 'none';
    document.getElementById('seccion-admin').style.display = seccion === 'admin' ? 'block' : 'none';
}

function toggleCarrito() {
    const sidebar = document.getElementById('sidebar-carrito');
    const overlay = document.getElementById('capa-oscura');
    sidebar.classList.toggle('active');
    overlay.style.display = sidebar.classList.contains('active') ? 'block' : 'none';
}

// 3. Renderizado de Tienda e Inventario
function renderTodo() {
    const grid = document.getElementById('grid-productos');
    const tabla = document.getElementById('tabla-admin');
    
    grid.innerHTML = '';
    tabla.innerHTML = '';

    productos.forEach(p => {
        // Render Tienda
        grid.innerHTML += `
            <div class="card">
                <img src="${p.img || 'https://via.placeholder.com/400x250'}">
                <div class="card-info">
                    <h3>${p.nombre}</h3>
                    <p class="precio-tag">$${p.precio.toFixed(2)}</p>
                    <p><small>Stock: ${p.stock}</small></p>
                    <button class="btn-add" onclick="agregarAlCarrito(${p.id})" ${p.stock <= 0 ? 'disabled' : ''}>
                        ${p.stock > 0 ? 'Añadir al Carrito' : 'Agotado'}
                    </button>
                </div>
            </div>`;

        // Render Admin
        tabla.innerHTML += `
            <tr>
                <td>${p.nombre}</td>
                <td>$${p.precio}</td>
                <td>${p.stock}</td>
                <td><button onclick="eliminarProducto(${p.id})" style="color:red; border:none; background:none; cursor:pointer;"><i class="fas fa-trash"></i></button></td>
            </tr>`;
    });
}

// 4. Lógica de Productos
document.getElementById('form-nuevo-producto').addEventListener('submit', (e) => {
    e.preventDefault();
    const nuevo = {
        id: Date.now(),
        nombre: document.getElementById('nombre').value,
        precio: parseFloat(document.getElementById('precio').value),
        stock: parseInt(document.getElementById('stock').value),
        img: document.getElementById('imagen').value
    };
    productos.push(nuevo);
    e.target.reset();
    renderTodo();
});

function eliminarProducto(id) {
    productos = productos.filter(p => p.id !== id);
    renderTodo();
}

// 5. Lógica del Carrito
function agregarAlCarrito(id) {
    const p = productos.find(item => item.id === id);
    const enCarrito = carrito.find(item => item.id === id);

    if (enCarrito) {
        if (enCarrito.cantidad < p.stock) enCarrito.cantidad++;
        else alert("No hay más stock disponible");
    } else {
        carrito.push({ ...p, cantidad: 1 });
    }
    actualizarCarritoUI();
}

function actualizarCarritoUI() {
    const container = document.getElementById('items-carrito');
    container.innerHTML = '';
    let subtotal = 0;

    carrito.forEach(item => {
        subtotal += item.precio * item.cantidad;
        container.innerHTML += `
            <div style="display:flex; justify-content:space-between; margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">
                <div>
                    <strong>${item.nombre}</strong><br>
                    <small>$${item.precio} x ${item.cantidad}</small>
                </div>
                <div style="font-weight:bold;">$${(item.precio * item.cantidad).toFixed(2)}</div>
            </div>`;
    });

    const iva = subtotal * 0.19;
    const total = subtotal + iva;

    document.getElementById('subtotal').innerText = `$${subtotal.toFixed(2)}`;
    document.getElementById('iva').innerText = `$${iva.toFixed(2)}`;
    document.getElementById('total').innerText = `$${total.toFixed(2)}`;
    document.getElementById('cart-count').innerText = carrito.reduce((acc, i) => acc + i.cantidad, 0);
}

function finalizarCompra() {
    if (carrito.length === 0) return alert("El carrito está vacío");
    alert("¡Pedido Confirmado! Gracias por su compra.");
    carrito = [];
    actualizarCarritoUI();
    toggleCarrito();
}

// Inicialización
document.addEventListener('DOMContentLoaded', renderTodo);