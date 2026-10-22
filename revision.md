# Revisión del porcentaje de Java

## Resumen

No hay contradicción entre el **50,79 % del backend** y el **18,4 % de Java**
que aparece en el gráfico de lenguajes de GitHub. Son porcentajes distintos,
calculados sobre alcances distintos:

- **50,79 %** compara únicamente las líneas no vacías del backend Java con las
  del backend PHP.
- **18,4 %** es la proporción de Java que GitHub atribuye al código del
  repositorio completo. El gráfico muestra también **TypeScript (68,3 %)**,
  **PHP (11,7 %)**, **CSS (1,5 %)** y otros lenguajes.

Por eso no es correcto afirmar que la mitad de todo el proyecto está escrita en
Java. La afirmación precisa es: **Java supera por poco la mitad del código del
backend medido frente al PHP**, mientras que la mayor parte del repositorio
completo corresponde al frontend TypeScript.

## Qué indica el gráfico de GitHub

La captura compartida muestra estos porcentajes aproximados:

| Lenguaje mostrado | Porcentaje del repositorio |
|---|---:|
| TypeScript (mostrado traducido como «Mecanografiado») | 68,3 % |
| Java | 18,4 % |
| PHP | 11,7 % |
| CSS | 1,5 % |
| Otros lenguajes | 0,1 % |

El gráfico de GitHub clasifica el código fuente del **repositorio completo**
mediante GitHub Linguist y pondera la cantidad de contenido atribuida a cada
lenguaje. No calcula «Java dividido entre Java más PHP del backend». Por ello,
incluye el peso del frontend TypeScript y los demás lenguajes. Además, GitHub
puede ignorar archivos que clasifica como generados, dependencias o vendorizados.

## De dónde sale el 50,79 %

Para medir la composición del backend se compararon las carpetas de producción
Java y PHP:

| Alcance contado | Archivos | Líneas no vacías |
|---|---:|---:|
| Java: `java-service/src/main/java` | 25 | 2 583 |
| PHP: `api/` y `server.php` | 24 | 2 503 |
| **Total Java + PHP del backend** | **49** | **5 086** |

**Cálculo:** `2 583 ÷ (2 583 + 2 503) × 100 = 50,79 %`.

El conteo incluye comentarios, excluye líneas en blanco y no incluye las pruebas
Java (`src/test`), dependencias instaladas ni resultados generados. Cuenta solo
el backend; no incluye TypeScript, componentes visuales, CSS, documentación ni
los demás archivos del producto.

La diferencia es pequeña: Java tiene **80 líneas no vacías más** que el PHP
incluido en esta comparación. Si cambia el código o el alcance del conteo, el
porcentaje puede bajar de 50 %. No debe presentarse como una cifra permanente
sin volver a medirla.

## Por qué los porcentajes no se pueden comparar directamente

| Indicador | Numerador | Denominador | Qué responde |
|---|---|---|---|
| Java del backend: 50,79 % | Líneas Java de producción | Líneas Java + PHP de producción | ¿Qué proporción de este backend Java/PHP es Java por líneas no vacías? |
| Java en GitHub: 18,4 % | Contenido que GitHub atribuye a Java | Contenido de todos los lenguajes del repositorio que GitHub clasifica | ¿Qué parte del código del repositorio completo se atribuye a Java en el gráfico? |

Son métricas legítimas para preguntas diferentes. El 18,4 % no invalida el
cálculo del backend, y el 50,79 % no describe el repositorio entero.

## Conclusión y recomendación

Al describir el proyecto, usa una formulación con el alcance explícito:

> «El backend supera por poco el 50 % de Java al comparar líneas de producción
> no vacías de Java y PHP: 2 583 de 5 086 líneas (50,79 %). En el gráfico de
> lenguajes del repositorio completo, GitHub muestra aproximadamente 18,4 % de
> Java y 68,3 % de TypeScript.»

Las cifras del gráfico corresponden a la captura compartida y pueden cambiar
cuando se actualiza el repositorio. Los conteos de líneas también deben
recalcularse después de modificar los archivos o el criterio de inclusión.

El detalle del alcance del backend y su cálculo está en
[`javaagregados.md`](javaagregados.md).
