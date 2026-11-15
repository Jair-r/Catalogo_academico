import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const API_URL = 'https://api-examen-final-ofvn.onrender.com/api';
const Stack = createNativeStackNavigator();

// Función central para consultar la API y validar las respuestas.
async function consultarAPI(ruta) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const respuesta = await fetch(`${API_URL}${ruta}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    let json;
    try {
      json = await respuesta.json();
    } catch {
      throw new Error('El servidor no devolvió una respuesta JSON válida.');
    }

    if (!respuesta.ok || !json.success) {
      throw new Error(json.message || `Error HTTP ${respuesta.status}`);
    }

    return json.data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('La consulta tardó demasiado. Revisá tu conexión e intentá nuevamente.');
    }
    if (error.message === 'Network request failed') {
      throw new Error('No se pudo conectar con el servidor. Revisá Internet e intentá nuevamente.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function Boton({ titulo, onPress, secundario = false, disabled = false }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.boton,
        secundario && styles.botonSecundario,
        disabled && styles.botonDeshabilitado,
      ]}
    >
      <Text style={[styles.botonTexto, secundario && styles.botonTextoSecundario]}>
        {titulo}
      </Text>
    </TouchableOpacity>
  );
}

function EstadoCarga({ texto = 'Cargando información...' }) {
  return (
    <View style={styles.estado}>
      <ActivityIndicator size="large" color="#2563EB" />
      <Text style={styles.estadoTexto}>{texto}</Text>
      <Text style={styles.estadoAyuda}>
        La primera consulta puede tardar unos segundos porque el servidor puede estar inactivo.
      </Text>
    </View>
  );
}

function EstadoError({ mensaje, reintentar }) {
  return (
    <View style={styles.estado}>
      <Text style={styles.errorIcono}>!</Text>
      <Text style={styles.estadoTitulo}>No se pudo cargar la información</Text>
      <Text style={styles.errorTexto}>{mensaje}</Text>
      <Boton titulo="Reintentar" onPress={reintentar} />
    </View>
  );
}

function Encabezado({ subtitulo }) {
  return (
    <View style={styles.encabezado}>
      <Text style={styles.marca}>AULA MÓVIL</Text>
      <Text style={styles.tituloPrincipal}>Catálogo académico</Text>
      <Text style={styles.subtitulo}>{subtitulo}</Text>
    </View>
  );
}

// Pantalla principal: consulta categorías, cursos y estado de la API.
function InicioScreen({ navigation }) {
  const [cursos, setCursos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [errorCategorias, setErrorCategorias] = useState('');
  const [estadoAPI, setEstadoAPI] = useState('Comprobando servidor...');

  const comprobarServidor = useCallback(async () => {
    try {
      const resultado = await consultarAPI('/health');
      setEstadoAPI(resultado?.status === 'ok' ? 'Servidor disponible' : 'Respuesta recibida');
    } catch {
      setEstadoAPI('No se pudo comprobar el servidor');
    }
  }, []);

  const cargarCategorias = useCallback(async () => {
    try {
      setErrorCategorias('');
      const datos = await consultarAPI('/categorias');
      setCategorias(Array.isArray(datos) ? datos : []);
    } catch (e) {
      setErrorCategorias(e.message || 'No fue posible cargar las categorías.');
      setCategorias([]);
    }
  }, []);

  const cargarCursos = useCallback(async (idCategoria = null) => {
    try {
      setCargando(true);
      setError('');
      const ruta = idCategoria === null
        ? '/cursos'
        : `/cursos?categoria_id=${encodeURIComponent(idCategoria)}`;
      const datos = await consultarAPI(ruta);
      setCursos(Array.isArray(datos) ? datos : []);
    } catch (e) {
      setCursos([]);
      setError(e.message || 'No fue posible cargar los cursos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarCategorias();
    cargarCursos(null);
    comprobarServidor();
  }, [cargarCategorias, cargarCursos, comprobarServidor]);

  const seleccionarCategoria = (id) => {
    const nuevoId = categoriaSeleccionada === id ? null : id;
    setCategoriaSeleccionada(nuevoId);
    cargarCursos(nuevoId);
  };

  const actualizarTodo = () => {
    cargarCategorias();
    cargarCursos(categoriaSeleccionada);
    comprobarServidor();
  };

  const renderCurso = ({ item }) => (
    <TouchableOpacity
      style={styles.tarjetaCurso}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('DetalleCurso', { id: item.id })}
    >
      <View style={styles.tarjetaFila}>
        <View style={styles.iconoCurso}>
          <Text style={styles.iconoCursoTexto}>📘</Text>
        </View>
        <View style={styles.cursoContenido}>
          <Text style={styles.cursoNombre}>{item.nombre || 'Curso sin nombre'}</Text>
          <Text style={styles.cursoCategoria}>
            {item.categoria?.nombre || 'Sin categoría'}
          </Text>
        </View>
        <Text style={styles.flecha}>›</Text>
      </View>
      <View style={styles.tarjetaPie}>
        <Text style={styles.datoCurso}>◷  {item.duracion_horas ?? 'N/D'} horas</Text>
        <Text style={styles.verDetalle}>Ver detalle</Text>
      </View>
    </TouchableOpacity>
  );

  const listaHeader = (
    <View>
      <View style={styles.estadoServidor}>
        <View style={styles.puntoEstado} />
        <Text style={styles.estadoServidorTexto}>{estadoAPI}</Text>
        <TouchableOpacity onPress={comprobarServidor}>
          <Text style={styles.enlacePequeno}>Verificar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.seccionTituloFila}>
        <Text style={styles.seccionTitulo}>Categorías</Text>
        <Text style={styles.seccionAyuda}>Tocá para filtrar</Text>
      </View>

      {errorCategorias ? (
        <View style={styles.aviso}>
          <Text style={styles.avisoTexto}>{errorCategorias}</Text>
          <TouchableOpacity onPress={cargarCategorias}>
            <Text style={styles.enlacePequeno}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriasScroll}>
          <TouchableOpacity
            onPress={() => seleccionarCategoria(null)}
            style={[styles.chip, categoriaSeleccionada === null && styles.chipActivo]}
          >
            <Text style={[styles.chipTexto, categoriaSeleccionada === null && styles.chipTextoActivo]}>
              Todos
            </Text>
          </TouchableOpacity>
          {categorias.map((categoria) => (
            <TouchableOpacity
              key={String(categoria.id)}
              onPress={() => seleccionarCategoria(categoria.id)}
              style={[
                styles.chip,
                categoriaSeleccionada === categoria.id && styles.chipActivo,
              ]}
            >
              <Text style={[
                styles.chipTexto,
                categoriaSeleccionada === categoria.id && styles.chipTextoActivo,
              ]}>
                {categoria.nombre}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.seccionTituloFila}>
        <Text style={styles.seccionTitulo}>
          {categoriaSeleccionada === null ? 'Todos los cursos' : 'Cursos filtrados'}
        </Text>
        {!cargando && !error ? (
          <Text style={styles.contador}>{cursos.length} resultado(s)</Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.contenedor}>
      <StatusBar barStyle="light-content" backgroundColor="#102A43" />
      <FlatList
        data={cargando || error ? [] : cursos}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderCurso}
        ListHeaderComponent={
          <View>
            <Encabezado subtitulo="Explorá cursos y encontrá tu próximo aprendizaje." />
            {listaHeader}
          </View>
        }
        ListEmptyComponent={
          cargando ? (
            <EstadoCarga texto="Consultando cursos en la API..." />
          ) : error ? (
            <EstadoError mensaje={error} reintentar={actualizarTodo} />
          ) : (
            <View style={styles.vacio}>
              <Text style={styles.vacioIcono}>📚</Text>
              <Text style={styles.estadoTitulo}>No hay cursos disponibles</Text>
              <Text style={styles.estadoAyuda}>
                No se encontraron cursos para esta selección. Probá otra categoría.
              </Text>
            </View>
          )
        }
        contentContainerStyle={styles.listaContenido}
        showsVerticalScrollIndicator={false}
        refreshing={cargando}
        onRefresh={actualizarTodo}
      />
    </SafeAreaView>
  );
}

// Pantalla de detalle: consulta obligatoriamente /cursos/{id}.
function DetalleCursoScreen({ route, navigation }) {
  const { id } = route.params;
  const [curso, setCurso] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargarDetalle = useCallback(async () => {
    try {
      setCargando(true);
      setError('');
      const datos = await consultarAPI(`/cursos/${encodeURIComponent(id)}`);
      setCurso(datos);
    } catch (e) {
      setCurso(null);
      setError(e.message || 'No fue posible consultar el detalle del curso.');
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    cargarDetalle();
  }, [cargarDetalle]);

  return (
    <SafeAreaView style={styles.contenedor}>
      <StatusBar barStyle="light-content" backgroundColor="#102A43" />
      <ScrollView contentContainerStyle={styles.detalleContenido}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.volver}>
          <Text style={styles.volverTexto}>‹  Volver al catálogo</Text>
        </TouchableOpacity>

        <Text style={styles.marcaDetalle}>INFORMACIÓN ACADÉMICA</Text>

        {cargando ? (
          <EstadoCarga texto="Consultando detalle del curso..." />
        ) : error ? (
          <EstadoError mensaje={error} reintentar={cargarDetalle} />
        ) : curso ? (
          <View style={styles.detalleTarjeta}>
            <View style={styles.detalleIcono}>
              <Text style={styles.detalleIconoTexto}>🎓</Text>
            </View>
            <Text style={styles.detalleNombre}>{curso.nombre}</Text>
            <Text style={styles.detalleCategoria}>
              {curso.categoria?.nombre || 'Sin categoría'}
            </Text>

            <View style={styles.separador} />

            <Text style={styles.campoTitulo}>Descripción</Text>
            <Text style={styles.descripcion}>
              {curso.descripcion || 'No hay descripción disponible.'}
            </Text>

            <View style={styles.datosGrid}>
              <View style={styles.datoCaja}>
                <Text style={styles.datoEtiqueta}>DURACIÓN</Text>
                <Text style={styles.datoValor}>{curso.duracion_horas ?? 'N/D'} horas</Text>
              </View>
              <View style={styles.datoCaja}>
                <Text style={styles.datoEtiqueta}>NIVEL</Text>
                <Text style={styles.datoValor}>{curso.nivel || 'No especificado'}</Text>
              </View>
            </View>

            <Text style={styles.campoTitulo}>Categoría</Text>
            <Text style={styles.descripcion}>
              {curso.categoria?.nombre || 'Sin categoría'}
            </Text>
            {curso.categoria?.descripcion ? (
              <Text style={styles.categoriaDescripcion}>
                {curso.categoria.descripcion}
              </Text>
            ) : null}

            <View style={styles.idFila}>
              <Text style={styles.idTexto}>ID del curso consultado: {curso.id}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Inicio"
        screenOptions={{
          headerStyle: { backgroundColor: '#102A43' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#F3F6FA' },
        }}
      >
        <Stack.Screen
          name="Inicio"
          component={InicioScreen}
          options={{ title: 'Catálogo académico' }}
        />
        <Stack.Screen
          name="DetalleCurso"
          component={DetalleCursoScreen}
          options={{ title: 'Detalle del curso' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#F3F6FA' },
  listaContenido: { paddingBottom: 28 },
  encabezado: {
    backgroundColor: '#102A43',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  marca: { color: '#93C5FD', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  tituloPrincipal: { color: '#FFFFFF', fontSize: 27, fontWeight: '800', marginTop: 9 },
  subtitulo: { color: '#D8E4F0', fontSize: 14, marginTop: 7, lineHeight: 21 },
  estadoServidor: {
    marginHorizontal: 18,
    marginTop: 17,
    marginBottom: 20,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#E7F6EE',
    flexDirection: 'row',
    alignItems: 'center',
  },
  puntoEstado: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16A34A', marginRight: 9 },
  estadoServidorTexto: { flex: 1, color: '#166534', fontSize: 12, fontWeight: '600' },
  enlacePequeno: { color: '#2563EB', fontSize: 12, fontWeight: '700', padding: 4 },
  seccionTituloFila: {
    marginHorizontal: 20,
    marginBottom: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seccionTitulo: { color: '#102A43', fontSize: 18, fontWeight: '800' },
  seccionAyuda: { color: '#718096', fontSize: 11 },
  categoriasScroll: { paddingLeft: 18, marginBottom: 22 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE4EE',
    marginRight: 8,
  },
  chipActivo: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  chipTexto: { color: '#526477', fontSize: 12, fontWeight: '700' },
  chipTextoActivo: { color: '#FFFFFF' },
  contador: { color: '#718096', fontSize: 11 },
  tarjetaCurso: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 18,
    marginBottom: 12,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5EAF1',
    elevation: 2,
    shadowColor: '#102A43',
    shadowOpacity: 0.05,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
  },
  tarjetaFila: { flexDirection: 'row', alignItems: 'center' },
  iconoCurso: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconoCursoTexto: { fontSize: 21 },
  cursoContenido: { flex: 1 },
  cursoNombre: { color: '#102A43', fontSize: 15, fontWeight: '800', lineHeight: 21 },
  cursoCategoria: { color: '#64748B', fontSize: 12, marginTop: 4 },
  flecha: { color: '#2563EB', fontSize: 28, marginLeft: 8 },
  tarjetaPie: {
    borderTopWidth: 1,
    borderTopColor: '#EEF1F5',
    marginTop: 13,
    paddingTop: 11,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  datoCurso: { color: '#64748B', fontSize: 12, fontWeight: '600' },
  verDetalle: { color: '#2563EB', fontSize: 12, fontWeight: '800' },
  estado: { alignItems: 'center', paddingHorizontal: 28, paddingVertical: 35 },
  estadoTexto: { color: '#334155', fontSize: 14, fontWeight: '700', marginTop: 13 },
  estadoTitulo: { color: '#102A43', fontSize: 17, fontWeight: '800', textAlign: 'center', marginTop: 10 },
  estadoAyuda: { color: '#718096', fontSize: 12, textAlign: 'center', lineHeight: 19, marginTop: 8, marginBottom: 16 },
  errorIcono: {
    width: 42, height: 42, borderRadius: 21, overflow: 'hidden',
    textAlign: 'center', textAlignVertical: 'center',
    backgroundColor: '#FEE2E2', color: '#B91C1C', fontSize: 25, fontWeight: '800',
  },
  errorTexto: { color: '#B91C1C', fontSize: 13, textAlign: 'center', lineHeight: 20, marginTop: 8, marginBottom: 16 },
  boton: { backgroundColor: '#2563EB', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 11, alignItems: 'center' },
  botonSecundario: { backgroundColor: '#EAF2FF' },
  botonDeshabilitado: { opacity: 0.5 },
  botonTexto: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  botonTextoSecundario: { color: '#2563EB' },
  aviso: {
    marginHorizontal: 18, marginBottom: 18, padding: 12,
    borderRadius: 10, backgroundColor: '#FFF7ED',
  },
  avisoTexto: { color: '#9A3412', fontSize: 12, marginBottom: 5 },
  vacio: { alignItems: 'center', padding: 28, marginHorizontal: 18, backgroundColor: '#FFFFFF', borderRadius: 16 },
  vacioIcono: { fontSize: 34 },
  detalleContenido: { padding: 18, paddingBottom: 35 },
  volver: { marginBottom: 23, alignSelf: 'flex-start' },
  volverTexto: { color: '#2563EB', fontSize: 14, fontWeight: '800' },
  marcaDetalle: { color: '#64748B', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 },
  detalleTarjeta: {
    backgroundColor: '#FFFFFF', borderRadius: 19, padding: 20,
    borderWidth: 1, borderColor: '#E5EAF1',
  },
  detalleIcono: {
    width: 58, height: 58, borderRadius: 17, backgroundColor: '#EAF2FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 15,
  },
  detalleIconoTexto: { fontSize: 28 },
  detalleNombre: { color: '#102A43', fontSize: 23, fontWeight: '900', lineHeight: 30 },
  detalleCategoria: { color: '#2563EB', fontSize: 13, fontWeight: '700', marginTop: 7 },
  separador: { height: 1, backgroundColor: '#E8EDF3', marginVertical: 20 },
  campoTitulo: { color: '#102A43', fontSize: 14, fontWeight: '800', marginBottom: 8, marginTop: 5 },
  descripcion: { color: '#526477', fontSize: 14, lineHeight: 22, marginBottom: 15 },
  datosGrid: { flexDirection: 'row', marginVertical: 8, marginBottom: 20 },
  datoCaja: { flex: 1, backgroundColor: '#F3F6FA', padding: 13, borderRadius: 12, marginRight: 8 },
  datoEtiqueta: { color: '#718096', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  datoValor: { color: '#102A43', fontSize: 15, fontWeight: '800', marginTop: 7 },
  categoriaDescripcion: { color: '#718096', fontSize: 12, lineHeight: 19, marginTop: -8, marginBottom: 12 },
  idFila: { borderTopWidth: 1, borderTopColor: '#E8EDF3', paddingTop: 13, marginTop: 10 },
  idTexto: { color: '#94A3B8', fontSize: 11 },
});
