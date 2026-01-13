import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import ImageModule from "@slosarek/docxtemplater-image-module-free";
import api from "../api/axios";

// Helper to sanitize text for XML
const cleanText = (val) => {
    if (val === null || val === undefined) return "";
    return String(val).replace(/[^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFD\u10000-\u10FFFF]/g, "");
};

// Helper: Create a 1x1 Transparent PNG Buffer
const getTransparentImage = () => {
    const fallbackBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    try {
        const binaryString = typeof atob === 'function' ? atob(fallbackBase64) :
            (typeof Buffer !== 'undefined' ? Buffer.from(fallbackBase64, 'base64').toString('binary') : "");

        if (!binaryString) {
            console.error("No atob or Buffer available for image decode.");
            return new ArrayBuffer(0);
        }

        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    } catch (e) {
        console.error("getTransparentImage Error:", e);
        return new ArrayBuffer(0);
    }
};

// Helper to stamp text on image (Browser Canvas)
async function stampTextOnImage(arrayBuffer, text) {
    if (!text) return arrayBuffer;

    return new Promise((resolve, reject) => {
        const blob = new Blob([arrayBuffer]);
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');

            // Draw original image
            ctx.drawImage(img, 0, 0);

            // Settings for the box
            const fontSize = Math.max(30, img.width * 0.1);
            ctx.font = `bold ${fontSize}px Arial`;
            const padding = fontSize * 0.3;
            const textMetrics = ctx.measureText(text);
            const textWidth = textMetrics.width;
            const boxWidth = textWidth + (padding * 2);
            const boxHeight = fontSize + (padding * 2);

            const x = 0;
            const y = 0;

            // Draw White Box
            ctx.fillStyle = "white";
            ctx.fillRect(x, y, boxWidth, boxHeight);

            // Draw Red Border
            ctx.lineWidth = Math.max(2, img.width * 0.01);
            ctx.strokeStyle = "red";
            ctx.strokeRect(x, y, boxWidth, boxHeight);

            // Draw Text
            ctx.fillStyle = "black";
            ctx.textBaseline = "top";
            ctx.fillText(text, x + padding, y + padding);

            // Convert back to ArrayBuffer
            canvas.toBlob((newBlob) => {
                if (!newBlob) {
                    resolve(arrayBuffer);
                    return;
                }
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsArrayBuffer(newBlob);
            }, 'image/jpeg', 0.95);
        };
        img.onerror = (e) => {
            console.warn("Image load for stamping failed", e);
            resolve(arrayBuffer);
        }
        img.src = URL.createObjectURL(blob);
    });
}

// Helper to load the template file
const loadFile = (url) => {
    return new Promise((resolve, reject) => {
        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error(`Failed to load template: ${res.statusText}`);
                return res.arrayBuffer();
            })
            .then(buffer => {
                if (buffer.byteLength < 100) {
                    throw new Error("Fetched file is too small. It might be an HTML error page.");
                }
                const view = new Uint8Array(buffer.slice(0, 4));
                const signature = String.fromCharCode(...view);
                if (!signature.startsWith('PK')) {
                    throw new Error("Fetched file header does not match DOCX/Zip (PK).");
                }
                resolve(buffer);
            })
            .catch(reject);
    });
};

export const generateDoc = async (inspectionData, equipment, inspector, photos) => {
    try {
        console.log("Input Photos:", photos); // DEBUG

        // 1. Load the template
        const templatePath = "/report-template.docx?v=" + new Date().getTime();
        console.log("Fetching template from:", templatePath);

        const content = await loadFile(templatePath);

        const zip = new PizZip(content);

        const imageOpts = {
            centered: false,
            fileType: "docx",
            getImage: function (tagValue, tagName) {
                try {
                    if (tagValue && typeof tagValue === 'object' && tagValue.binary) {
                        return tagValue.binary;
                    }
                    if (tagValue instanceof ArrayBuffer) return tagValue;
                    if (tagValue instanceof Uint8Array) return tagValue.buffer;
                } catch (e) {
                    console.error("[ImageModule] getImage Error:", e);
                }

                return getTransparentImage();
            },
            getSize: function (img, tagValue, tagName) {
                if (tagValue && typeof tagValue === 'object' && tagValue.w && tagValue.h) {
                    return [tagValue.w, tagValue.h];
                }
                return [200, 200];
            }
        };

        // Initialize the image module
        const imageModule = new ImageModule(imageOpts);

        // DOUBLE ENSURE OPTIONS ARE SET (Fix for some library versions)
        imageModule.options.getImage = imageOpts.getImage;
        imageModule.options.getSize = imageOpts.getSize;

        const doc = new Docxtemplater(zip, {
            modules: [imageModule],
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '[[', end: ']]' },
            nullGetter: () => ""
        });

        // Group photos by CanvasPhotoURL OR by integer part of PhotoNumbering
        const groups = {};
        const canvasGroups = new Map(); // Track canvas groups separately

        if (Array.isArray(photos)) {
            photos.forEach(p => {
                // Check if this photo has a CanvasPhotoURL
                const canvasUrl = p.CanvasPhotoURL;
                if (canvasUrl && canvasUrl !== '-' && canvasUrl.trim() !== '') {
                    // Group by canvas URL
                    if (!canvasGroups.has(canvasUrl)) {
                        canvasGroups.set(canvasUrl, []);
                    }
                    canvasGroups.get(canvasUrl).push(p);
                } else {
                    // Group by integer part of PhotoNumbering (original logic)
                    let num = p.PhotoNumbering;
                    if (num === undefined || num === null) num = 0;

                    let key = Math.floor(Number(num));
                    if (isNaN(key)) key = 0;

                    if (!groups[key]) groups[key] = [];
                    groups[key].push(p);
                }
            });
        }

        // Merge canvas groups into the main groups structure
        // Canvas groups get their own keys based on the first photo's numbering
        canvasGroups.forEach((photoList, canvasUrl) => {
            if (photoList.length > 0) {
                const firstPhoto = photoList[0];
                let num = firstPhoto.PhotoNumbering;
                if (num === undefined || num === null) num = 0;
                let key = Math.floor(Number(num));
                if (isNaN(key)) key = 0;

                // Mark this group as a canvas group
                groups[key] = photoList;
                groups[key]._isCanvas = true;
                groups[key]._canvasUrl = canvasUrl;
            }
        });

        // Collect all groups into an array of arrays
        const sortedKeys = Object.keys(groups).sort((a, b) => Number(a) - Number(b));
        const allGroups = sortedKeys.map(key => groups[key]);

        // Helper to chunk array
        const chunkHelper = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
            arr.slice(i * size, i * size + size)
        );

        // Chunk the LIST OF GROUPS into sizes of 3 (3 groups per page)
        let groupChunks = chunkHelper(allGroups, 3);

        // Pre-fetch ALL Images
        const imageMap = new Map();
        const allPhotos = [];
        if (groupChunks) {
            groupChunks.forEach(chunk => {
                if (chunk) {
                    chunk.forEach(group => {
                        if (group && group.length > 0) {
                            // For canvas groups, fetch the canvas image
                            if (group._isCanvas && group._canvasUrl) {
                                // Add a placeholder photo object for the canvas
                                allPhotos.push({
                                    PhotoURL: group._canvasUrl,
                                    PhotoNumbering: null, // Don't stamp canvas images
                                    _isCanvasImage: true
                                });
                            } else {
                                // Add ALL individual photos in the group
                                allPhotos.push(...group);
                            }
                        }
                    });
                }
            });
        }

        await Promise.all(allPhotos.map(async (p) => {
            if (!p) return;
            const url = cleanText(p.PhotoURL);
            if (url && !imageMap.has(url)) {
                try {
                    const res = await fetch(url, { mode: 'cors' });
                    if (res.ok) {
                        let buf = await res.arrayBuffer();

                        // STAMP NUMBERING ON IMAGE (but not on canvas images)
                        if (p.PhotoNumbering && !p._isCanvasImage) {
                            try {
                                let numText = String(p.PhotoNumbering);
                                if (!isNaN(p.PhotoNumbering) && Number(p.PhotoNumbering) % 1 === 0) {
                                    numText += ".0";
                                }
                                buf = await stampTextOnImage(buf, numText);
                            } catch (err) {
                                console.error("Failed to stamp image:", err);
                            }
                        }

                        imageMap.set(url, buf);
                    } else {
                        console.error("Image fetch failed status:", res.status);
                    }
                } catch (e) { console.error("Img fetch error", url, e); }
            }
        }));

        // Create explicit fallback buffer for this run
        const safeBuffer = getTransparentImage();

        console.log("Starting PhotoPages mapping...");
        const photoPages = groupChunks.map((groupsOfPage, index) => {
            try {
                return (function () {

                    const mapGroup = (groupArr) => {
                        if (!groupArr || groupArr.length === 0) {
                            return {
                                PhotoNumbering: "",
                                Photos: []
                            };
                        }

                        const mainPhoto = groupArr[0];
                        const groupNumber = Math.floor(Number(mainPhoto.PhotoNumbering)) || "-";

                        const extractDesc = (obj) => {
                            if (!obj) return undefined;

                            let desc;
                            if (Array.isArray(obj) && obj.length > 0) {
                                desc = obj[0].Description;
                            } else if (typeof obj === 'object') {
                                desc = obj.Description;
                            } else {
                                return undefined;
                            }

                            // If description is "Nil", preserve it
                            if (desc && (desc.toLowerCase().trim() === 'nil' || desc.toLowerCase().trim() === 'nil.')) {
                                return 'Nil.';
                            }

                            return desc;
                        };

                        // Check if this is a canvas group
                        const isCanvas = groupArr._isCanvas;
                        const canvasUrl = groupArr._canvasUrl;

                        let photos = [];

                        if (isCanvas && canvasUrl) {
                            // For canvas groups, use a single canvas image
                            const imageBuffer = imageMap.get(canvasUrl);
                            const finalBuffer = imageBuffer || getTransparentImage();

                            photos = [{
                                photoNumber: groupNumber,
                                image: { binary: finalBuffer, w: 250, h: 200 },
                                caption: "-",
                                finding: "-",
                                recommendation: "-"
                            }];
                        } else {
                            // Original logic for individual photos
                            const count = groupArr.length;
                            let imgW = 200;
                            let imgH = 200;

                            if (count === 1) {
                                imgW = 250; imgH = 200;
                            } else if (count === 2) {
                                imgW = 145; imgH = 120;
                            } else if (count >= 3) {
                                imgW = 140; imgH = 100;
                            }

                            photos = groupArr.map(p => {
                                const url = cleanText(p.PhotoURL);
                                const imageBuffer = imageMap.get(url);
                                const finalBuffer = imageBuffer || getTransparentImage();

                                let pNum = p.PhotoNumbering;
                                if (pNum && !isNaN(pNum) && Number(pNum) % 1 === 0) {
                                    pNum = `${pNum}.0`;
                                }

                                return {
                                    photoNumber: pNum || "-",
                                    image: { binary: finalBuffer, w: imgW, h: imgH },
                                    caption: cleanText(p.Caption || p.Category || "-"),
                                    finding: cleanText((p.FindingID == null) ? "Nil." : (extractDesc(p.Finding) || "-")),
                                    recommendation: cleanText((p.RecommendID == null) ? "Nil." : (extractDesc(p.Recommendation) || "-"))
                                };
                            });
                        }

                        // Combine Findings and Recommendations for the group
                        const formatEntry = (p, textFunc, idField) => {
                            // If ID is null/undefined, return "Nil."
                            if (p[idField] == null) {
                                let pNum = p.PhotoNumbering;
                                let prefix = "";
                                if (pNum && !isNaN(pNum) && Number(pNum) % 1 !== 0) {
                                    prefix = `${pNum} `;
                                }
                                return cleanText(prefix + "Nil.");
                            }

                            let val = textFunc(p);
                            if (!val) val = "-";

                            let pNum = p.PhotoNumbering;

                            // Only add prefix for sub-photos (x.1, x.2, etc.), not main photos (x.0)
                            let prefix = "";
                            if (pNum && !isNaN(pNum) && Number(pNum) % 1 !== 0) {
                                prefix = `${pNum} `;
                            }

                            return cleanText(prefix + val);
                        };

                        const combinedFindings = groupArr
                            .map(p => formatEntry(p, (item) => extractDesc(item.Finding), 'FindingID'))
                            .join("\n");

                        const combinedRecs = groupArr
                            .map(p => formatEntry(p, (item) => extractDesc(item.Recommendation), 'RecommendID'))
                            .join("\n");

                        return {
                            PhotoNumbering: groupNumber,
                            Photos: photos,
                            FindingDesc: combinedFindings || "-",
                            RecommendDesc: combinedRecs || "-"
                        };
                    };

                    const getGroup = (idx) => (groupsOfPage && groupsOfPage.length > idx) ? groupsOfPage[idx] : undefined;

                    const r1 = mapGroup(getGroup(0));
                    const r2 = mapGroup(getGroup(1));
                    const r3 = mapGroup(getGroup(2));

                    const formatNum = (n) => {
                        if (n && !isNaN(n) && Number(n) % 1 === 0) return `${n}.0`;
                        return n || "-";
                    };

                    return {
                        Row1_PhotoNumbering: r1.PhotoNumbering,
                        Row1_photoNumber: formatNum(r1.PhotoNumbering),
                        Row1_Photos: r1.Photos,
                        Row1_FindingDesc: r1.FindingDesc,
                        Row1_RecommendDesc: r1.RecommendDesc,

                        Row2_PhotoNumbering: r2.PhotoNumbering,
                        Row2_photoNumber: formatNum(r2.PhotoNumbering),
                        Row2_Photos: r2.Photos,
                        Row2_FindingDesc: r2.FindingDesc,
                        Row2_RecommendDesc: r2.RecommendDesc,

                        Row3_PhotoNumbering: r3.PhotoNumbering,
                        Row3_photoNumber: formatNum(r3.PhotoNumbering),
                        Row3_Photos: r3.Photos,
                        Row3_FindingDesc: r3.FindingDesc,
                        Row3_RecommendDesc: r3.RecommendDesc
                    };
                })();
            } catch (err) {
                console.error("Error inside map for page", index, err);
                return {};
            }
        });

        // 2. Prepare Data 
        console.log("Step: Data Prep Start");

        // Extract year from ReportNo
        const extractYear = (reportNo) => {
            try {
                const match = (reportNo || "").match(/\/TA(\d{4})/);
                return match ? match[1] : "-";
            } catch (e) { return "-"; }
        };

        const reportNo = inspectionData.ReportNo || `INS-${inspectionData.InspectionID}`;
        const extractedYear = extractYear(reportNo);
        console.log("Step: Years Extracted");

        const data = {
            RootTest: "ROOT_IS_WORKING",
            TagNo: equipment?.EquipTagNo || equipment?.TagNo || inspectionData.EquipmentTagNo || "-",
            Year: extractedYear,
            PlantName: equipment?.Plant || equipment?.PlantName || inspectionData.Plant || "-",
            DOSH: equipment?.DOSHRegNo || equipment?.DOSH || inspectionData.DOSHRegNo || "-",
            FullName: inspector?.FullName || "Unknown Inspector",

            EquipmentTagNo: equipment?.EquipTagNo || equipment?.TagNo || inspectionData.EquipmentTagNo || "-",
            EquipDescription: equipment?.EquipDescription || inspectionData.EquipDescription || "-",
            Plant: equipment?.Plant || equipment?.PlantName || inspectionData.Plant || "-",
            DOSHRegNo: equipment?.DOSHRegNo || equipment?.DOSH || inspectionData.DOSHRegNo || "-",
            Manufacturer: equipment?.Manufacturer || "-",
            YearBuilt: extractedYear,
            DesignPressure: equipment?.DesignPressure || "-",
            DesignTemperature: equipment?.DesignTemperature || "-",

            ReportNo: reportNo,
            ReportDate: inspectionData.ReportDate || new Date().toISOString().split('T')[0],
            InspectionDate: inspectionData.ReportDate || "-",

            Findings: inspectionData.Findings || "-",
            NDTs: inspectionData.NDTs || "-",
            Recommendations: inspectionData.Recommendations || "-",
            Post_Final_Inspection: inspectionData.Post_Final_Inspection || "-",

            InspectorName: inspector?.FullName || "Unknown Inspector",
            InspectorID: inspector?.UserID || "-",

            PhotoPages: photoPages
        };

        // 3. Render the document
        console.log("Generated Data Keys:", Object.keys(data));
        console.log("PhotoPages Count:", data.PhotoPages ? data.PhotoPages.length : 0);
        try {
            doc.render(data);
        } catch (renderError) {
            console.error("Error during doc.render:", renderError);
            if (renderError.properties && renderError.properties.errors) {
                renderError.properties.errors.forEach(e => console.error(e));
            }
            throw renderError;
        }

        // 4. Output Blob
        const out = doc.getZip().generate({
            type: "blob",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });

        return out;

    } catch (error) {
        console.error("Doc generation failed", error);
        if (error.properties && error.properties.errors) {
            const errorMessages = error.properties.errors.map(function (e) {
                return e.properties.explanation;
            }).join("\n");
            console.error("Template Errors:", errorMessages);
            throw new Error(`Template Error: ${errorMessages}`);
        }
        throw error;
    }
};
