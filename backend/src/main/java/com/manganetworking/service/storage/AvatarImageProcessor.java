package com.manganetworking.service.storage;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;

/** Decodes and normalizes profile avatars to a bounded, metadata-free JPEG. */
@Component
public class AvatarImageProcessor {

    private static final int OUTPUT_SIZE = 512;
    private static final int MAX_DIMENSION = 8192;
    private static final long MAX_PIXELS = 16_000_000L;

    public byte[] normalize(byte[] sourceBytes) {
        if (sourceBytes == null || sourceBytes.length == 0) {
            throw new IllegalArgumentException("Imagem de avatar vazia ou ausente.");
        }

        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(sourceBytes))) {
            if (input == null) throw invalidImage();
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw invalidImage();

            ImageReader reader = readers.next();
            try {
                reader.setInput(input, true, true);
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                if (width <= 0 || height <= 0 || width > MAX_DIMENSION || height > MAX_DIMENSION
                        || (long) width * height > MAX_PIXELS) {
                    throw new IllegalArgumentException("Dimensões da imagem de avatar excedem o limite permitido.");
                }

                BufferedImage source = reader.read(0);
                if (source == null) throw invalidImage();
                return toJpegSquare(source);
            } finally {
                reader.dispose();
            }
        } catch (IOException | RuntimeException exception) {
            if (exception instanceof FilePolicyException filePolicyException) {
                throw filePolicyException;
            }
            if (exception instanceof IllegalArgumentException illegalArgumentException) {
                throw illegalArgumentException;
            }
            throw new FilePolicyException(HttpStatus.BAD_REQUEST, "A imagem de avatar está inválida ou corrompida.");
        }
    }

    private byte[] toJpegSquare(BufferedImage source) throws IOException {
        int cropSize = Math.min(source.getWidth(), source.getHeight());
        int cropX = (source.getWidth() - cropSize) / 2;
        int cropY = (source.getHeight() - cropSize) / 2;
        BufferedImage normalized = new BufferedImage(OUTPUT_SIZE, OUTPUT_SIZE, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = normalized.createGraphics();
        try {
            graphics.setColor(Color.WHITE);
            graphics.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            graphics.drawImage(source, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE,
                    cropX, cropY, cropX + cropSize, cropY + cropSize, null);
        } finally {
            graphics.dispose();
            source.flush();
        }

        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            if (!ImageIO.write(normalized, "jpg", output)) throw new IOException("JPEG writer unavailable");
            return output.toByteArray();
        } finally {
            normalized.flush();
        }
    }

    private FilePolicyException invalidImage() {
        return new FilePolicyException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "Avatar inválido. Envie uma imagem JPEG ou PNG decodificável.");
    }
}
