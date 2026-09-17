// Recorta a pessoa do fundo com a Vision do macOS - o mesmo motor que o Preview
// usa em "Remover fundo". Trata o cabelo muito melhor do que qualquer limiar de
// cor, que é o que se conseguiria em Python puro.
//
// Uso:  osascript -l JavaScript tools/recortar-fundo.js entrada.png saida.png
//
// A saída é um PNG com transparência - o formato que o tools/preparar-fotos.py
// já sabe assentar sobre fundo branco.
//
// Está em JavaScript e não em Swift porque estas Command Line Tools têm o
// compilador dessincronizado do SDK e não compilam nada que importe a Vision.

ObjC.import('Foundation');
ObjC.import('AppKit');
ObjC.import('CoreImage');
ObjC.import('Vision');

function run(argv) {
    if (argv.length !== 2) {
        throw new Error('uso: recortar-fundo.js <entrada> <saida.png>');
    }
    var entrada = argv[0], saida = argv[1];

    var origem = $.CIImage.imageWithContentsOfURL($.NSURL.fileURLWithPath(entrada));
    if (!origem || origem.isNil()) throw new Error('nao consegui abrir ' + entrada);

    var handler = $.VNImageRequestHandler.alloc.initWithCIImageOptions(origem, $());
    var pedido = $.VNGenerateForegroundInstanceMaskRequest.alloc.init;

    var erro = Ref();
    if (!handler.performRequestsError($([pedido]), erro)) {
        throw new Error('a Vision falhou');
    }
    if (pedido.results.count === 0) throw new Error('nenhuma pessoa encontrada');

    var obs = pedido.results.objectAtIndex(0);
    var mascara = $.CIImage.imageWithCVPixelBuffer(
        obs.generateScaledMaskForImageForInstancesFromRequestHandlerError(
            obs.allInstances, handler, Ref()));

    // Sem imagem de fundo, tudo o que fica fora da máscara sai transparente.
    var recorte = origem.imageByApplyingFilterWithInputParameters(
        'CIBlendWithMask', $({ inputMaskImage: mascara }));

    // Passamos por NSImage para gravar o PNG sem depender das constantes de
    // formato da CoreImage, que não estão expostas nesta ponte.
    var rep = $.NSCIImageRep.imageRepWithCIImage(recorte);
    var img = $.NSImage.alloc.initWithSize(rep.size);
    img.addRepresentation(rep);
    var bitmap = $.NSBitmapImageRep.imageRepWithData(img.TIFFRepresentation);
    var png = bitmap.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $({}));
    png.writeToFileAtomically(saida, true);

    return saida + '  (' + obs.allInstances.count + ' pessoa(s))';
}
