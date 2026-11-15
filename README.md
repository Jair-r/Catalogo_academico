# Catálogo académico móvil

Proyecto de evaluación final desarrollado con React Native, Expo y JavaScript (JSX).

## Integrantes
1. jair smir Ramirez Delgadillo
2. Mishel Annely Reyes Carvajal
3. Saul Ramon Aguilera Hernandez


## Requisitos
- Node.js instalado.
- Expo Go actualizado o emulador Android compatible.
- Conexión a Internet.

## Instalación
En la carpeta del proyecto ejecutar:

```Terminal
npm install
npx expo install --fix
npx expo start
```

Escanear el código QR con Expo Go o ejecutar en un emulador Android.

## API utilizada
https://api-examen-final-ofvn.onrender.com/api

Rutas consumidas:
- GET /health
- GET /categorias
- GET /cursos
- GET /cursos/{id}
- GET /cursos?categoria_id={id}

## Funcionalidades
- Consulta de cursos reales mediante fetch.
- Listado de cursos con FlatList.
- Consulta de categorías y filtro desde la API.
- Navegación a detalle y consulta por ID.
- Indicadores de carga, errores, lista vacía y reintento.
- Comprobación del estado del servidor.

## Importante
No se incluyen node_modules, credenciales ni secretos. Los datos del catálogo se obtienen desde la API pública del docente.
