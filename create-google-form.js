/**
 * Google Apps Script para crear el formulario de feedback de la beta de SACLO.
 *
 * Como ejecutarlo:
 * 1. Entra en https://script.google.com/ con tu cuenta de Google.
 * 2. Crea un proyecto nuevo.
 * 3. Copia este archivo en el editor, sustituyendo el contenido de Code.gs.
 * 4. Ejecuta la funcion createSacloBetaFeedbackForm.
 * 5. Acepta los permisos que pida Google.
 * 6. Abre Ver > Registros para copiar la URL de edicion y la URL para compartir.
 */
function createSacloBetaFeedbackForm() {
  var form = FormApp.create('Feedback Beta — SACLO');

  form.setDescription(
    'Gracias por probar SACLO. Este formulario sirve para mejorar la app antes de seguir desarrollándola. Responde con sinceridad: lo más útil son los fallos, dudas y cosas que te darían pereza.'
  );

  form.addSectionHeaderItem()
    .setTitle('Prueba la app')
    .setHelpText('Link de la app: https://saclo.net');

  addShortTextQuestion(form, 'Nombre o iniciales', true);

  addMultipleChoiceQuestion(
    form,
    '¿Has probado la app desde móvil o desde ordenador?',
    ['Móvil', 'Ordenador', 'Ambos'],
    true
  );

  addMultipleChoiceQuestion(
    form,
    '¿Entendiste rápido para qué sirve SACLO?',
    ['Sí', 'Más o menos', 'No'],
    true
  );

  addLinearScaleQuestion(form, 'Del 1 al 10, ¿qué nota le das visualmente?', true);
  addLinearScaleQuestion(form, 'Del 1 al 10, ¿qué tan fácil fue usarla?', true);

  addCheckboxQuestion(
    form,
    '¿Qué partes probaste?',
    [
      'Añadir prenda individual',
      'Crear prenda desde foto del armario',
      'Generar outfit',
      'Guardar outfit',
      'Marcar outfit como usado',
      'Ver armario visual',
      'Ver historial'
    ],
    true
  );

  addParagraphQuestion(form, '¿Qué parte te pareció más útil?', true);
  addParagraphQuestion(form, '¿Qué parte te pareció más confusa o pesada?', true);

  addMultipleChoiceQuestion(
    form,
    '¿Te dio pereza añadir ropa?',
    ['Sí', 'Un poco', 'No'],
    true
  );

  addMultipleChoiceQuestion(
    form,
    '¿El sistema de recortar prendas desde una foto del armario te parece útil?',
    ['Sí', 'Más o menos', 'No'],
    true
  );

  addMultipleChoiceQuestion(
    form,
    '¿Preferirías que la app detectara las prendas automáticamente con IA?',
    ['Sí, sería clave', 'Estaría bien, pero no es imprescindible', 'Me da igual'],
    true
  );

  addMultipleChoiceQuestion(
    form,
    '¿Los outfits recomendados te parecieron realistas?',
    ['Sí', 'Algunos', 'No'],
    true
  );

  addMultipleChoiceQuestion(
    form,
    '¿Te pondrías algún outfit que te recomendó?',
    ['Sí', 'Tal vez', 'No'],
    true
  );

  addParagraphQuestion(form, '¿Qué tendría que mejorar el recomendador de outfits?', true);
  addParagraphQuestion(form, '¿Qué tendría que mejorar para que la usaras de verdad?', true);

  addCheckboxQuestion(
    form,
    '¿Qué función te gustaría ver sí o sí?',
    [
      'Escaneo automático del armario',
      'Mejor IA de outfits',
      'Clima automático',
      'Calendario de looks',
      'No repetir outfits',
      'Recomendaciones de compra',
      'Perfil de estilo',
      'Otra'
    ],
    true
  );

  addMultipleChoiceQuestion(
    form,
    '¿Usarías SACLO si funcionara bien con IA real?',
    ['Sí', 'Tal vez', 'No'],
    true
  );

  addMultipleChoiceQuestion(
    form,
    '¿Pagarías por una versión premium?',
    ['Sí', 'No', 'Depende'],
    true
  );

  addMultipleChoiceQuestion(
    form,
    '¿Qué precio te parecería razonable?',
    ['Gratis', '1,99 €/mes', '2,99 €/mes', '4,99 €/mes', 'Pago único', 'No pagaría'],
    true
  );

  addLinearScaleQuestion(form, 'Del 1 al 10, ¿qué nota general le das?', true);

  addMultipleChoiceQuestion(
    form,
    '¿Se la enseñarías a alguien?',
    ['Sí', 'No'],
    true
  );

  addParagraphQuestion(
    form,
    'Comentarios finales: ¿qué cambiarías, quitarías o añadirías?',
    false
  );

  Logger.log('URL para editar el formulario: ' + form.getEditUrl());
  Logger.log('URL para compartirlo con usuarios: ' + form.getPublishedUrl());
}

function addShortTextQuestion(form, title, required) {
  form.addTextItem()
    .setTitle(title)
    .setRequired(required);
}

function addParagraphQuestion(form, title, required) {
  form.addParagraphTextItem()
    .setTitle(title)
    .setRequired(required);
}

function addMultipleChoiceQuestion(form, title, options, required) {
  form.addMultipleChoiceItem()
    .setTitle(title)
    .setChoiceValues(options)
    .setRequired(required);
}

function addCheckboxQuestion(form, title, options, required) {
  form.addCheckboxItem()
    .setTitle(title)
    .setChoiceValues(options)
    .setRequired(required);
}

function addLinearScaleQuestion(form, title, required) {
  form.addScaleItem()
    .setTitle(title)
    .setBounds(1, 10)
    .setLabels('1', '10')
    .setRequired(required);
}
