require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// --- SERVIR ARCHIVOS ESTÁTICOS ---
app.use(express.static(__dirname));

// --- CONFIGURACIÓN DEL POOL ---
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'TiendaVirtual',
    waitForConnections: true,
    connectionLimit: 10
});

const dbPromise = db.promise();

// ─────────────────────────────────────────────
//  PRODUCTOS
// ─────────────────────────────────────────────

// Obtener todos los productos
app.get('/api/productos', (req, res) => {
    db.query('SELECT * FROM productos ORDER BY id_producto DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Guardar producto nuevo
app.post('/api/productos/nuevo', (req, res) => {
    const { nombre, descripcion, precio, stock, imagen_url, categoria } = req.body;
    const sql = `INSERT INTO productos (nombre, descripcion, precio, stock_actual, imagen_url, id_categorias) VALUES (?, ?, ?, ?, ?, ?)`;
    db.query(sql, [nombre, descripcion, precio, stock, imagen_url, categoria], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id_producto: result.insertId });
    });
});

// Editar producto existente
app.put('/api/productos/editar/:id', (req, res) => {
    const { nombre, precio, stock, descripcion, id_categoria } = req.body;
    const sql = `UPDATE productos SET nombre=?, precio=?, stock_actual=?, descripcion=?, id_categorias=? WHERE id_producto=?`;
    db.query(sql, [nombre, precio, stock, descripcion, id_categoria, req.params.id], (err) => {
        if (err) return res.json({ success: false, error: err.message });
        res.json({ success: true, message: 'Producto actualizado' });
    });
});

// Eliminar producto
app.delete('/api/productos/eliminar/:id', (req, res) => {
    db.query('DELETE FROM productos WHERE id_producto = ?', [req.params.id], (err) => {
        if (err) return res.json({ success: false, error: err.message });
        res.json({ success: true, message: 'Producto eliminado' });
    });
});

// ─────────────────────────────────────────────
//  CATEGORÍAS
// ─────────────────────────────────────────────
app.get('/api/obtener-categorias', (req, res) => {
    db.query('SELECT * FROM categorias', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ─────────────────────────────────────────────
//  PEDIDOS — CREAR (ruta principal del flujo de compra)
//  Columnas reales de tu tabla pedidos:
//  cliente_nombre, documento, telefono, correo,
//  direccion, total_pago, fecha_pedido,
//  codigo_pedido, estado, numero_guia, transportadora
// ─────────────────────────────────────────────
app.post('/api/crear-pedido', async (req, res) => {
    const { nombre_cliente, telefono, direccion, email, documento, carrito, total } = req.body;
    const totalNumerico = parseFloat(total) || 0;

    if (!carrito || !Array.isArray(carrito) || carrito.length === 0) {
        return res.status(400).json({ success: false, error: 'El carrito está vacío o mal formado' });
    }

    const connection = await dbPromise.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Guardar o actualizar cliente
        await connection.query(
            `INSERT INTO clientes (nombre, documento, email, telefono, direccion)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             nombre=VALUES(nombre),
             telefono=VALUES(telefono),
             direccion=VALUES(direccion),
             email=VALUES(email)`,
            [nombre_cliente, documento, email, telefono, direccion]
        );

        // 2. Insertar pedido con los nombres REALES de la tabla
        const [resPedido] = await connection.query(
            `INSERT INTO pedidos
             (cliente_nombre, documento, telefono, correo, direccion, total_pago, estado)
             VALUES (?, ?, ?, ?, ?, ?, 'Pendiente')`,
            [nombre_cliente, documento, telefono, email, direccion, totalNumerico]
        );

        const idPedidoGenerado = resPedido.insertId;
        const codigoUnico = `ARK-${1000 + idPedidoGenerado}`;

        // 3. Asignar código ARK
        await connection.query(
            'UPDATE pedidos SET codigo_pedido = ? WHERE id_pedido = ?',
            [codigoUnico, idPedidoGenerado]
        );

        // 4. Descontar stock de cada producto
        for (const item of carrito) {
            await connection.query(
                'UPDATE productos SET stock_actual = stock_actual - ? WHERE id_producto = ?',
                [item.cantidad || item.qty, item.id_producto || item.id]
            );
        }

        await connection.commit();
        res.json({ success: true, orden: codigoUnico, id_venta: idPedidoGenerado });

    } catch (error) {
        await connection.rollback();
        console.error('❌ ERROR EN TRANSACCIÓN:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        connection.release();
    }
});

// ─────────────────────────────────────────────
//  PEDIDOS — RUTA DE PRUEBA (quitar en producción)
// ─────────────────────────────────────────────
app.post('/api/pedidos/prueba', async (req, res) => {
    const { nombre_cliente, documento, telefono, email, direccion, carrito, total } = req.body;
    const totalNumerico = parseFloat(total) || 0;

    const connection = await dbPromise.getConnection();
    try {
        await connection.beginTransaction();

        await connection.query(
            `INSERT INTO clientes (nombre, documento, email, telefono, direccion)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             nombre=VALUES(nombre), telefono=VALUES(telefono),
             direccion=VALUES(direccion), email=VALUES(email)`,
            [nombre_cliente, documento, email, telefono, direccion]
        );

        const [resPedido] = await connection.query(
            `INSERT INTO pedidos
             (cliente_nombre, documento, telefono, correo, direccion, total_pago, estado)
             VALUES (?, ?, ?, ?, ?, ?, 'Pendiente')`,
            [nombre_cliente, documento, telefono, email, direccion, totalNumerico]
        );

        const idPedido = resPedido.insertId;
        const codigo   = `ARK-${1000 + idPedido}`;

        await connection.query(
            'UPDATE pedidos SET codigo_pedido = ? WHERE id_pedido = ?',
            [codigo, idPedido]
        );

        for (const item of carrito) {
            await connection.query(
                'UPDATE productos SET stock_actual = stock_actual - ? WHERE id_producto = ?',
                [item.cantidad || item.qty, item.id_producto || item.id]
            );
        }

        await connection.commit();
        res.json({ success: true, orden: codigo, id_pedido: idPedido });

    } catch (error) {
        await connection.rollback();
        res.status(500).json({ success: false, error: error.message });
    } finally {
        connection.release();
    }
});

// ─────────────────────────────────────────────
//  PEDIDOS — VER TODOS (administrador)
// ─────────────────────────────────────────────
app.get('/api/admin/pedidos', async (req, res) => {
    try {
        const query = `
            SELECT
                p.id_pedido,
                p.codigo_pedido,
                p.fecha_pedido     AS fecha,
                p.total_pago       AS total,
                p.estado,
                p.numero_guia,
                p.transportadora,
                p.cliente_nombre   AS nombre_cliente,
                p.documento        AS documento_cliente,
                p.telefono,
                p.correo           AS email,
                p.direccion
            FROM pedidos p
            LEFT JOIN clientes c ON p.documento = c.documento
            ORDER BY p.fecha_pedido DESC
        `;
        const [results] = await dbPromise.query(query);
        res.json(results);
    } catch (error) {
        console.error('Error en admin/pedidos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─────────────────────────────────────────────
//  PEDIDOS — ELIMINAR
// ─────────────────────────────────────────────
app.delete('/api/pedidos/eliminar/:id', (req, res) => {
    db.query('DELETE FROM pedidos WHERE id_pedido = ?', [req.params.id], (err) => {
        if (err) return res.json({ success: false, error: err.message });
        res.json({ success: true, message: 'Pedido eliminado' });
    });
});

// ─────────────────────────────────────────────
//  PEDIDOS — ACTUALIZAR ESTADO
// ─────────────────────────────────────────────
app.put('/api/pedidos/estado/:id', (req, res) => {
    const { estado } = req.body;
    db.query(
        'UPDATE pedidos SET estado = ? WHERE id_pedido = ?',
        [estado, req.params.id],
        (err) => {
            if (err) return res.json({ success: false, error: err.message });
            res.json({ success: true });
        }
    );
});

// ─────────────────────────────────────────────
//  PEDIDOS — GUARDAR GUÍA DE ENVÍO
// ─────────────────────────────────────────────
app.put('/api/pedidos/guia/:id', (req, res) => {
    const { numero_guia, transportadora } = req.body;
    db.query(
        'UPDATE pedidos SET numero_guia = ?, transportadora = ? WHERE id_pedido = ?',
        [numero_guia, transportadora, req.params.id],
        (err) => {
            if (err) return res.json({ success: false, error: err.message });
            res.json({ success: true });
        }
    );
});

// ─────────────────────────────────────────────
//  LANZAMIENTO
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 Arktech Store en línea!`);
    console.log(`📡 Servidor: http://localhost:${PORT}`);
    console.log(`📂 Archivos servidos desde: ${__dirname}\n`);
});