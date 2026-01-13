import { jsPDF } from "jspdf";

const extractText = (value) => {
    if (!value) return "";
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
        if (value.Description) return value.Description;
        if (value.description) return value.description;
        if (value.text) return value.text;
        if (value.content) return value.content;
        return JSON.stringify(value);
    }
    return String(value);
};

const hasValidData = (photo) => {
    const finding = extractText(photo.Finding).trim();
    const recommendation = extractText(photo.Recommendation).trim();
    
    const hasFinding = finding && finding !== "-" && finding !== "{}" && finding.toLowerCase() !== "nil";
    const hasRecommendation = recommendation && recommendation !== "-" && recommendation !== "{}" && recommendation.toLowerCase() !== "nil";
    
    return hasFinding || hasRecommendation;
};

const getBase64ImageFromURL = async (url, stampText) => {
    try {
        const response = await fetch(url, { mode: 'cors', cache: 'no-cache' });
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
        const blob = await response.blob();

        const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");

                ctx.drawImage(img, 0, 0);

                if (stampText) {
                    const fontSize = Math.max(30, img.width * 0.1);
                    ctx.font = `bold ${fontSize}px Arial`;
                    const padding = fontSize * 0.3;
                    const textMetrics = ctx.measureText(stampText);
                    const textWidth = textMetrics.width;
                    const boxWidth = textWidth + (padding * 2);
                    const boxHeight = fontSize + (padding * 2);

                    ctx.fillStyle = "white";
                    ctx.fillRect(0, 0, boxWidth, boxHeight);

                    ctx.lineWidth = Math.max(2, img.width * 0.01);
                    ctx.strokeStyle = "red";
                    ctx.strokeRect(0, 0, boxWidth, boxHeight);

                    ctx.fillStyle = "black";
                    ctx.textBaseline = "top";
                    ctx.fillText(stampText, padding, padding);
                }

                const finalDataURL = canvas.toDataURL("image/jpeg");
                resolve(finalDataURL);
            };
            img.onerror = () => resolve(null);
            img.src = base64Data;
        });

    } catch (error) {
        console.error("Error loading image for PDF:", url, error);
        return null;
    }
};

function shouldUseCanvas(photos) {
    if (!Array.isArray(photos) || photos.length === 0) return false;
    const hasCanvas = photos.some(p => p.CanvasPhotoURL && p.CanvasPhotoURL !== "-" && p.CanvasPhotoURL.trim() !== "");
    console.log("🎨 PDF Canvas mode:", hasCanvas);
    return hasCanvas;
}

function getCanvasUrls(photos) {
    const canvasUrls = new Set();
    photos.forEach(p => {
        if (p.CanvasPhotoURL && p.CanvasPhotoURL !== "-" && p.CanvasPhotoURL.trim() !== "") {
            canvasUrls.add(p.CanvasPhotoURL);
        }
    });
    return Array.from(canvasUrls);
}

export const generatePDF = async (inspectionData, equipment, inspector, photos) => {
    console.log("=== PDF Generation Started ===");
    console.log("PDF Photos provided:", photos?.length || 0);
    
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    const equipmentTag = equipment?.EquipTagNo || equipment?.TagNo || inspectionData.EquipmentTagNo || "-";
    const equipmentDesc = equipment?.EquipDescription || inspectionData.EquipDescription || "-";
    const plantArea = equipment?.Plant || equipment?.PlantName || inspectionData.Plant || "-";
    const doshNo = equipment?.DOSHRegNo || equipment?.DOSH || inspectionData.DOSHRegNo || "-";
    const reportNo = inspectionData.ReportNo || `INS-${inspectionData.InspectionID}`;
    const reportDate = inspectionData.ReportDate || "-";

    const finalFindings = inspectionData.Findings || "-";
    const ndts = inspectionData.NDTs || "-";
    const recommendations = inspectionData.Recommendations || "-";
    const inspectorName = inspector?.FullName || "Unknown Inspector";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("MAJOR TURNAROUND 2026", pageWidth / 2, 15, { align: 'center' });
    doc.text("PRESSURE VESSEL INSPECTION REPORT", pageWidth / 2, 22, { align: 'center' });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    let y = 35;

    const addField = (label, value) => {
        doc.setFont("helvetica", "bold");
        doc.text(label, margin, y);
        doc.setFont("helvetica", "normal");
        doc.text(value, margin + 55, y);
        y += 6;
    };

    addField("Equipment tag no:", equipmentTag);
    addField("Equipment description:", equipmentDesc);
    addField("Plant/Unit/Area:", plantArea);
    addField("DOSH registration no.:", doshNo);
    addField("Report no.:", reportNo);
    addField("Report date.:", reportDate);

    y += 5;

    const addSection = (title, content) => {
        if (y > pageHeight - 30) {
            doc.addPage();
            y = 20;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(title, margin, y);
        y += 6;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const splitText = doc.splitTextToSize(content, pageWidth - (margin * 2));
        doc.text(splitText, margin, y);
        y += (splitText.length * 5) + 8;
    };

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("FINDINGS, NDTs & RECOMMENDATIONS", margin, y);
    y += 8;

    addSection("FINDINGS", finalFindings);
    addSection("NON-DESTRUCTIVE TESTINGS", ndts);
    addSection("RECOMMENDATIONS", recommendations);

    if (y > pageHeight - 30) {
        doc.addPage();
        y = 20;
    } else {
        y = Math.max(y, pageHeight - 40);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Inspected by: ${inspectorName}`, margin, y);
    doc.text("Reviewed by: __________", margin + 85, y);
    y += 10;
    doc.text("Approved by (Client): __________", margin, y);

    if (photos && photos.length > 0) {
        const useCanvasMode = shouldUseCanvas(photos);

        doc.addPage();
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("PHOTOS REPORT", margin, 15);
        y = 30;

        if (useCanvasMode) {
            console.log("📸 PDF Using CANVAS mode");
            
            const canvasUrls = getCanvasUrls(photos);
            console.log("PDF Found", canvasUrls.length, "canvas layout(s)");

            for (let i = 0; i < canvasUrls.length; i++) {
                const canvasUrl = canvasUrls[i];
                
                if (y > pageHeight - 150) {
                    doc.addPage();
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(12);
                    doc.text("PHOTOS REPORT (continued)", margin, 15);
                    y = 30;
                }

                // Get ALL photos with this canvas URL
                const allPhotosInGroup = photos.filter(p => p.CanvasPhotoURL === canvasUrl);
                
                // FILTER: Only keep photos that have findings OR recommendations
                const photosWithData = allPhotosInGroup.filter(hasValidData);
                
                if (photosWithData.length === 0) {
                    console.log(`⚠️ PDF Canvas ${canvasUrl.substring(0, 30)} has no photos with data, skipping`);
                    continue;
                }
                
                // Sort by PhotoNumbering
                photosWithData.sort((a, b) => (a.PhotoNumbering || 0) - (b.PhotoNumbering || 0));
                
                console.log(`PDF Canvas ${canvasUrl.substring(0, 30)} has ${photosWithData.length} photos WITH data (out of ${allPhotosInGroup.length} total)`);

                // Get photo numbers for display - ONLY from photos with data
                const photoNumbers = photosWithData
                    .map(p => p.PhotoNumbering)
                    .filter(n => n !== null && n !== undefined)
                    .map(n => String(n));
                
                // ⚠️ CRITICAL: Template has "Photo " prefix, so return JUST numbers
                const photoNumberDisplay = photoNumbers.length > 0 
                    ? photoNumbers.join(', ')  // Just "1.1, 1.2"
                    : "-";

                // Collect findings from photos with data - include photo number prefix if multiple
                const findings = photosWithData
                    .map(p => {
                        const f = extractText(p.Finding).trim();
                        if (!f || f === "-" || f === "{}") return null;
                        
                        // If multiple photos, prefix with photo number
                        if (photosWithData.length > 1 && p.PhotoNumbering) {
                            return `Photo ${p.PhotoNumbering}: ${f}`;
                        }
                        return f;
                    })
                    .filter(Boolean);
                
                // Collect recommendations from photos with data - include photo number prefix if multiple
                const recommendations = photosWithData
                    .map(p => {
                        const r = extractText(p.Recommendation).trim();
                        if (!r || r === "-" || r.toLowerCase() === "nil" || r === "{}") return null;
                        
                        // If multiple photos, prefix with photo number
                        if (photosWithData.length > 1 && p.PhotoNumbering) {
                            return `Photo ${p.PhotoNumbering}: ${r}`;
                        }
                        return r;
                    })
                    .filter(Boolean);
                
                const finding = findings.length > 0 ? findings.join("\n\n") : "-";
                const recommendation = recommendations.length > 0 ? recommendations.join("\n\n") : "-";
                
                console.log(`  ${photoNumberDisplay}`);
                console.log(`  PDF Findings: ${findings.length} items`);
                console.log(`  PDF Recommendations: ${recommendations.length} items`);

                doc.setFont("helvetica", "bold");
                doc.setFontSize(10);
                doc.text(photoNumberDisplay, margin, y);
                y += 8;

                try {
                    const imgData = await getBase64ImageFromURL(canvasUrl, null);
                    if (imgData) {
                        const maxWidth = pageWidth - (2 * margin);
                        const maxHeight = 100;
                        
                        doc.addImage(imgData, "PNG", margin, y, maxWidth, maxHeight);
                        y += maxHeight + 10;
                        console.log("✅ PDF Canvas image added");
                    } else {
                        console.error("❌ PDF Canvas image data is null");
                        doc.setFont("helvetica", "italic");
                        doc.setFontSize(9);
                        doc.text("Canvas image could not be loaded", margin, y);
                        y += 10;
                    }
                } catch (e) {
                    console.error("❌ PDF Failed to add canvas:", e);
                    doc.setFont("helvetica", "italic");
                    doc.setFontSize(9);
                    doc.text("Canvas image error", margin, y);
                    y += 10;
                }

                doc.setFont("helvetica", "bold");
                doc.setFontSize(9);
                doc.text("Finding:", margin, y);
                y += 5;

                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                const findingLines = doc.splitTextToSize(finding, pageWidth - (2 * margin));
                doc.text(findingLines, margin, y);
                y += (findingLines.length * 4) + 5;

                doc.setFont("helvetica", "bold");
                doc.setFontSize(9);
                doc.text("Recommendation:", margin, y);
                y += 5;

                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                const recLines = doc.splitTextToSize(recommendation, pageWidth - (2 * margin));
                doc.text(recLines, margin, y);
                y += (recLines.length * 4) + 10;

                doc.setDrawColor(200);
                doc.line(margin, y, pageWidth - margin, y);
                y += 10;
            }

            // Handle non-canvas photos
            const nonCanvasPhotos = photos.filter(p => 
                !p.CanvasPhotoURL || p.CanvasPhotoURL === "-" || p.CanvasPhotoURL.trim() === ""
            );
            
            if (nonCanvasPhotos.length > 0) {
                console.log(`📸 PDF Processing ${nonCanvasPhotos.length} non-canvas photos`);
                
                const nonCanvasWithData = nonCanvasPhotos.filter(hasValidData);
                console.log(`  ${nonCanvasWithData.length} have findings/recommendations`);
                
                if (nonCanvasWithData.length > 0) {
                    const groups = {};
                    nonCanvasWithData.forEach(p => {
                        let num = p.PhotoNumbering;
                        if (num === undefined || num === null) num = 0;
                        let key = Math.floor(Number(num));
                        if (isNaN(key)) key = 0;
                        if (!groups[key]) groups[key] = [];
                        groups[key].push(p);
                    });

                    const sortedGroups = Object.keys(groups)
                        .sort((a, b) => Number(a) - Number(b))
                        .map(key => groups[key]);

                    console.log("PDF Non-canvas photo groups created:", sortedGroups.length);

                    const photoBoxWidth = 100;
                    const textBoxX = margin + photoBoxWidth + 5;
                    const textBoxWidth = pageWidth - textBoxX - margin;

                    for (let groupIndex = 0; groupIndex < sortedGroups.length; groupIndex++) {
                        const group = sortedGroups[groupIndex];
                        group.sort((a, b) => (a.PhotoNumbering || 0) - (b.PhotoNumbering || 0));

                        const groupNumber = Math.floor(group[0].PhotoNumbering || 0);
                        const isMultiPhoto = group.length > 1;
                        
                        const maxPhotoHeight = 70;
                        const totalPhotosHeight = group.length * (maxPhotoHeight / group.length) + (group.length - 1) * 2;

                        if (y + totalPhotosHeight + 10 > pageHeight - margin) {
                            doc.addPage();
                            doc.setFont("helvetica", "bold");
                            doc.setFontSize(12);
                            doc.text("PHOTOS REPORT (continued)", margin, 15);
                            y = 30;
                        }

                        const startY = y;

                        doc.setFont("helvetica", "bold");
                        doc.setFontSize(10);
                        const photoLabel = isMultiPhoto ? `Photo ${groupNumber}` : `Photo ${groupNumber}.0`;
                        doc.text(photoLabel, margin, y);
                        y += 5;

                        let photoY = y;
                        for (let i = 0; i < group.length; i++) {
                            const photo = group[i];
                            
                            const photoUrl = photo.PhotoURL;
                            let stampText = null;
                            if (photo.PhotoNumbering) {
                                stampText = String(photo.PhotoNumbering);
                            }

                            if (photoUrl) {
                                try {
                                    const imgData = await getBase64ImageFromURL(photoUrl, stampText);
                                    if (imgData) {
                                        const imgHeight = group.length === 1 ? 60 : 
                                                        group.length === 2 ? 35 : 25;
                                        doc.addImage(imgData, "JPEG", margin, photoY, 45, imgHeight);
                                        photoY += imgHeight + 2;
                                    }
                                } catch (e) {
                                    console.error("❌ PDF Individual photo error:", e);
                                }
                            }
                        }

                        doc.setFont("helvetica", "bold");
                        doc.setFontSize(9);
                        doc.text("Finding:", textBoxX, startY + 5);
                        
                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(8);
                        
                        const findings = group.map((p, idx) => {
                            const finding = extractText(p.Finding).trim();
                            if (!finding || finding === "-" || finding === "{}") return "";
                            
                            if (idx === 0) {
                                return finding;
                            } else {
                                return `${p.PhotoNumbering} ${finding}`;
                            }
                        }).filter(Boolean).join("\n\n");
                        
                        const findingLines = doc.splitTextToSize(findings || "-", textBoxWidth);
                        doc.text(findingLines, textBoxX, startY + 11);

                        const findingHeight = findingLines.length * 4;

                        doc.setFont("helvetica", "bold");
                        doc.setFontSize(9);
                        doc.text("Recommendation:", textBoxX, startY + 11 + findingHeight + 5);
                        
                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(8);
                        
                        const recommendations = group.map((p, idx) => {
                            const rec = extractText(p.Recommendation).trim();
                            if (!rec || rec === "-" || rec.toLowerCase() === "nil" || rec === "{}") return "";
                            
                            if (idx === 0) {
                                return rec;
                            } else {
                                return `${p.PhotoNumbering} ${rec}`;
                            }
                        }).filter(Boolean).join("\n\n");
                        
                        const recLines = doc.splitTextToSize(recommendations || "-", textBoxWidth);
                        doc.text(recLines, textBoxX, startY + 11 + findingHeight + 11);

                        y = photoY + 10;

                        doc.setDrawColor(200);
                        doc.line(margin, y, pageWidth - margin, y);
                        y += 5;
                    }
                }
            }

        } else {
            console.log("📸 PDF Using INDIVIDUAL PHOTOS mode (no canvas at all)");

            // Filter to only photos with data
            const photosWithData = photos.filter(hasValidData);
            console.log(`PDF Found ${photosWithData.length} photos with data (out of ${photos.length} total)`);

            if (photosWithData.length > 0) {
                const groups = {};
                photosWithData.forEach(p => {
                    let num = p.PhotoNumbering;
                    if (num === undefined || num === null) num = 0;
                    let key = Math.floor(Number(num));
                    if (isNaN(key)) key = 0;
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(p);
                });

                const sortedGroups = Object.keys(groups)
                    .sort((a, b) => Number(a) - Number(b))
                    .map(key => groups[key]);

                console.log("PDF Photo groups created:", sortedGroups.length);

                const photoBoxWidth = 100;
                const textBoxX = margin + photoBoxWidth + 5;
                const textBoxWidth = pageWidth - textBoxX - margin;

                for (let groupIndex = 0; groupIndex < sortedGroups.length; groupIndex++) {
                    const group = sortedGroups[groupIndex];
                    group.sort((a, b) => (a.PhotoNumbering || 0) - (b.PhotoNumbering || 0));

                    const groupNumber = Math.floor(group[0].PhotoNumbering || 0);
                    const isMultiPhoto = group.length > 1;
                    
                    const maxPhotoHeight = 70;
                    const totalPhotosHeight = group.length * (maxPhotoHeight / group.length) + (group.length - 1) * 2;

                    if (y + totalPhotosHeight + 10 > pageHeight - margin) {
                        doc.addPage();
                        doc.setFont("helvetica", "bold");
                        doc.setFontSize(12);
                        doc.text("PHOTOS REPORT (continued)", margin, 15);
                        y = 30;
                    }

                    const startY = y;

                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(10);
                    const photoLabel = isMultiPhoto ? `Photo ${groupNumber}` : `Photo ${groupNumber}.0`;
                    doc.text(photoLabel, margin, y);
                    y += 5;

                    let photoY = y;
                    for (let i = 0; i < group.length; i++) {
                        const photo = group[i];
                        
                        const photoUrl = photo.PhotoURL;
                        let stampText = null;
                        if (photo.PhotoNumbering) {
                            stampText = String(photo.PhotoNumbering);
                        }

                        if (photoUrl) {
                            try {
                                const imgData = await getBase64ImageFromURL(photoUrl, stampText);
                                if (imgData) {
                                    const imgHeight = group.length === 1 ? 60 : 
                                                    group.length === 2 ? 35 : 25;
                                    doc.addImage(imgData, "JPEG", margin, photoY, 45, imgHeight);
                                    photoY += imgHeight + 2;
                                }
                            } catch (e) {
                                console.error("❌ PDF Individual photo error:", e);
                            }
                        }
                    }

                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(9);
                    doc.text("Finding:", textBoxX, startY + 5);
                    
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(8);
                    
                    const findings = group.map((p, idx) => {
                        const finding = extractText(p.Finding).trim();
                        if (!finding || finding === "-" || finding === "{}") return "";
                        
                        if (idx === 0) {
                            return finding;
                        } else {
                            return `${p.PhotoNumbering} ${finding}`;
                        }
                    }).filter(Boolean).join("\n\n");
                    
                    const findingLines = doc.splitTextToSize(findings || "-", textBoxWidth);
                    doc.text(findingLines, textBoxX, startY + 11);

                    const findingHeight = findingLines.length * 4;

                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(9);
                    doc.text("Recommendation:", textBoxX, startY + 11 + findingHeight + 5);
                    
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(8);
                    
                    const recommendations = group.map((p, idx) => {
                        const rec = extractText(p.Recommendation).trim();
                        if (!rec || rec === "-" || rec.toLowerCase() === "nil" || rec === "{}") return "";
                        
                        if (idx === 0) {
                            return rec;
                        } else {
                            return `${p.PhotoNumbering} ${rec}`;
                        }
                    }).filter(Boolean).join("\n\n");
                    
                    const recLines = doc.splitTextToSize(recommendations || "-", textBoxWidth);
                    doc.text(recLines, textBoxX, startY + 11 + findingHeight + 11);

                    y = photoY + 10;

                    doc.setDrawColor(200);
                    doc.line(margin, y, pageWidth - margin, y);
                    y += 5;
                }
            }
        }

        if (y < pageHeight - 30) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.text(`Inspected by: ${inspectorName}`, margin, pageHeight - 20);
            doc.text(`Date: ${reportDate}`, pageWidth - margin - 40, pageHeight - 20);
        }
    }

    console.log("✅ PDF generated successfully");
    return doc.output("blob");
};
