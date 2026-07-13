(function () {
	const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
	const SUPPORTED_TEXT_FILE_EXTENSIONS = [".txt", ".md", ".csv", ".json", ".html", ".htm"];
	const SUPPORTED_PDF_FILE_EXTENSIONS = [".pdf"];
	const SUPPORTED_DOCX_FILE_EXTENSIONS = [".docx"];
	const SUPPORTED_DOC_FILE_EXTENSIONS = [".doc"];

	function readUploadedFile(file) {
		return new Promise((resolve, reject) => {
			if (!file) {
				reject(new Error("Choose a file before running."));
				return;
			}

			if (file.size === 0) {
				reject(new Error("The selected file is empty."));
				return;
			}

			if (file.size > MAX_UPLOAD_BYTES) {
				reject(new Error("This file is too large for browser-side summarising. Try a smaller file or paste the most relevant text."));
				return;
			}

			const lowerName = file.name.toLowerCase();
			if (SUPPORTED_PDF_FILE_EXTENSIONS.some((extension) => lowerName.endsWith(extension))) {
				readFileAsArrayBuffer(file)
					.then((buffer) => resolve(extractTextFromPdf(buffer)))
					.catch((error) => reject(error));
				return;
			}

			if (SUPPORTED_DOCX_FILE_EXTENSIONS.some((extension) => lowerName.endsWith(extension))) {
				readFileAsArrayBuffer(file)
					.then((buffer) => extractTextFromDocx(buffer))
					.then((text) => resolve(text))
					.catch((error) => reject(error));
				return;
			}

			if (SUPPORTED_DOC_FILE_EXTENSIONS.some((extension) => lowerName.endsWith(extension))) {
				readFileAsArrayBuffer(file)
					.then((buffer) => resolve(extractTextFromLegacyDoc(buffer)))
					.catch((error) => reject(error));
				return;
			}

			const isSupported = SUPPORTED_TEXT_FILE_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
			if (!isSupported) {
				reject(new Error("This upload type is planned, but only text-based files, PDFs, and DOCX files are supported right now."));
				return;
			}

			readFileAsText(file)
				.then((text) => resolve(text))
				.catch((error) => reject(error));
		});
	}

	function readFileAsText(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				const text = String(reader.result || "").trim();
				if (!text) {
					reject(new Error("The selected file does not contain readable text."));
					return;
				}
				resolve(text);
			};
			reader.onerror = () => reject(new Error("Could not read the selected file."));
			reader.readAsText(file);
		});
	}

	function readFileAsArrayBuffer(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result);
			reader.onerror = () => reject(new Error("Could not read the selected file."));
			reader.readAsArrayBuffer(file);
		});
	}

	function extractTextFromPdf(buffer) {
		if (!buffer || buffer.byteLength === 0) {
			throw new Error("The selected PDF is empty.");
		}

		const bytes = new Uint8Array(buffer);
		if (bytesToBinaryString(bytes.slice(0, 8)).indexOf("%PDF-") !== 0) {
			throw new Error("This file does not look like a valid PDF.");
		}

		const pdfText = bytesToBinaryString(bytes);
		const streamTexts = Array.from(pdfText.matchAll(/stream\r?\n?([\s\S]*?)\r?\n?endstream/g))
			.map((match) => extractPdfTextObjects(match[1]))
			.filter(Boolean);
		const text = cleanExtractedText(streamTexts.join("\n\n"));

		if (!text) {
			throw new Error("No readable PDF text found. Scanned or image-only PDFs need OCR, which is not supported yet.");
		}

		return text;
	}

	function bytesToBinaryString(bytes) {
		let output = "";
		const chunkSize = 8192;
		for (let index = 0; index < bytes.length; index += chunkSize) {
			output += String.fromCharCode(...bytes.slice(index, index + chunkSize));
		}
		return output;
	}

	function extractPdfTextObjects(stream) {
		return Array.from(stream.matchAll(/BT([\s\S]*?)ET/g))
			.map((match) => extractPdfStrings(match[1]))
			.flat()
			.join(" ");
	}

	function extractPdfStrings(textObject) {
		const literalStrings = Array.from(textObject.matchAll(/\((?:\\.|[^\\)])*\)/g))
			.map((match) => decodePdfLiteralString(match[0].slice(1, -1)));
		const hexStrings = Array.from(textObject.matchAll(/<([0-9A-Fa-f\s]{4,})>/g))
			.map((match) => decodePdfHexString(match[1]));
		return [...literalStrings, ...hexStrings].filter(Boolean);
	}

	function decodePdfLiteralString(value) {
		return value
			.replace(/\\n/g, "\n")
			.replace(/\\r/g, "\r")
			.replace(/\\t/g, "\t")
			.replace(/\\b/g, "\b")
			.replace(/\\f/g, "\f")
			.replace(/\\([()\\])/g, "$1")
			.replace(/\\([0-7]{1,3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)));
	}

	function decodePdfHexString(value) {
		const hex = value.replace(/\s+/g, "");
		let output = "";
		for (let index = 0; index < hex.length - 1; index += 2) {
			const code = parseInt(hex.slice(index, index + 2), 16);
			if (Number.isFinite(code) && code > 0) {
				output += String.fromCharCode(code);
			}
		}
		return output;
	}

	function cleanExtractedText(text) {
		return text
			.replace(/\u0000/g, "")
			.replace(/[ \t]+/g, " ")
			.replace(/\s+([,.;:!?])/g, "$1")
			.replace(/\n{3,}/g, "\n\n")
			.trim();
	}

	async function extractTextFromDocx(buffer) {
		if (!buffer || buffer.byteLength === 0) {
			throw new Error("The selected DOCX file is empty.");
		}

		const entries = getZipEntries(buffer);
		const documentEntry = entries.find((entry) => entry.name === "word/document.xml");
		if (!documentEntry) {
			throw new Error("This DOCX file does not contain a readable document body.");
		}

		const xmlBytes = await readZipEntry(buffer, documentEntry);
		const xml = new TextDecoder("utf-8").decode(xmlBytes);
		const text = extractTextFromDocxXml(xml);
		if (!text) {
			throw new Error("No readable DOCX text found.");
		}
		return text;
	}

	function getZipEntries(buffer) {
		if (!buffer || buffer.byteLength < 22) {
			throw new Error("This document archive is empty or incomplete.");
		}

		const view = new DataView(buffer);
		const eocdOffset = findEndOfCentralDirectory(view);
		if (eocdOffset < 0) {
			throw new Error("This DOCX file could not be read as a valid document archive.");
		}

		const entryCount = view.getUint16(eocdOffset + 10, true);
		const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true);
		const entries = [];
		let offset = centralDirectoryOffset;

		for (let index = 0; index < entryCount; index += 1) {
			if (offset + 46 > view.byteLength || view.getUint32(offset, true) !== 0x02014b50) {
				break;
			}

			const compressionMethod = view.getUint16(offset + 10, true);
			const compressedSize = view.getUint32(offset + 20, true);
			const uncompressedSize = view.getUint32(offset + 24, true);
			const fileNameLength = view.getUint16(offset + 28, true);
			const extraLength = view.getUint16(offset + 30, true);
			const commentLength = view.getUint16(offset + 32, true);
			const localHeaderOffset = view.getUint32(offset + 42, true);
			if (offset + 46 + fileNameLength + extraLength + commentLength > view.byteLength) {
				throw new Error("This DOCX file appears to be corrupt or incomplete.");
			}

			const nameBytes = new Uint8Array(buffer, offset + 46, fileNameLength);
			const name = new TextDecoder("utf-8").decode(nameBytes);

			entries.push({
				name,
				compressionMethod,
				compressedSize,
				uncompressedSize,
				localHeaderOffset,
			});

			offset += 46 + fileNameLength + extraLength + commentLength;
		}

		return entries;
	}

	function findEndOfCentralDirectory(view) {
		const minOffset = Math.max(0, view.byteLength - 0xffff - 22);
		for (let offset = view.byteLength - 22; offset >= minOffset; offset -= 1) {
			if (view.getUint32(offset, true) === 0x06054b50) {
				return offset;
			}
		}
		return -1;
	}

	async function readZipEntry(buffer, entry) {
		const view = new DataView(buffer);
		const offset = entry.localHeaderOffset;
		if (offset + 30 > view.byteLength || view.getUint32(offset, true) !== 0x04034b50) {
			throw new Error("This DOCX file has an invalid local file header.");
		}

		const fileNameLength = view.getUint16(offset + 26, true);
		const extraLength = view.getUint16(offset + 28, true);
		const dataOffset = offset + 30 + fileNameLength + extraLength;
		if (dataOffset + entry.compressedSize > view.byteLength) {
			throw new Error("This DOCX file appears to be corrupt or incomplete.");
		}

		const compressedBytes = new Uint8Array(buffer, dataOffset, entry.compressedSize);

		if (entry.compressionMethod === 0) {
			return compressedBytes;
		}

		if (entry.compressionMethod === 8) {
			return inflateRawBytes(compressedBytes);
		}

		throw new Error("This DOCX file uses an unsupported compression method.");
	}

	async function inflateRawBytes(bytes) {
		if (typeof DecompressionStream === "undefined") {
			throw new Error("This browser cannot decompress DOCX files directly. Try a newer Chrome version or paste the text.");
		}

		try {
			const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
			return new Uint8Array(await new Response(stream).arrayBuffer());
		} catch (error) {
			throw new Error("This DOCX file could not be decompressed. It may be corrupt or password-protected.");
		}
	}

	function extractTextFromDocxXml(xml) {
		const normalizedXml = xml
			.replace(/<w:tab\/>/g, "\t")
			.replace(/<w:br\/>/g, "\n")
			.replace(/<\/w:p>/g, "\n");
		const textNodes = normalizedXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
		return textNodes
			.map((node) => decodeXmlEntities(node.replace(/<[^>]+>/g, "")))
			.join(" ")
			.replace(/[ \t]+/g, " ")
			.replace(/\s+\n/g, "\n")
			.replace(/\n{3,}/g, "\n\n")
			.trim();
	}

	function extractTextFromLegacyDoc(buffer) {
		if (!buffer || buffer.byteLength === 0) {
			throw new Error("The selected DOC file is empty.");
		}

		const bytes = new Uint8Array(buffer);
		const singleByteText = bytesToBinaryString(bytes)
			.replace(/[^\x09\x0a\x0d\x20-\x7e]+/g, "\n")
			.split(/\n+/)
			.map((line) => line.trim())
			.filter((line) => line.length > 20)
			.join("\n");
		const utf16Text = extractUtf16LeText(bytes);
		const text = cleanExtractedText(`${singleByteText}\n${utf16Text}`);

		if (countWords(text) < 20) {
			throw new Error("No readable legacy DOC text found. Save the file as DOCX or paste the text.");
		}

		return text;
	}

	function extractUtf16LeText(bytes) {
		let output = "";
		let current = "";
		for (let index = 0; index < bytes.length - 1; index += 2) {
			const code = bytes[index] + (bytes[index + 1] << 8);
			if (code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126)) {
				current += String.fromCharCode(code);
				continue;
			}

			if (current.length > 20) {
				output += `${current}\n`;
			}
			current = "";
		}

		if (current.length > 20) {
			output += current;
		}

		return output;
	}

	function decodeXmlEntities(value) {
		return value
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&amp;/g, "&")
			.replace(/&quot;/g, '"')
			.replace(/&apos;/g, "'");
	}

	function countWords(text) {
		return text.split(/\s+/).filter(Boolean).length;
	}

	window.UploadReaders = {
		readUploadedFile,
	};
})();
