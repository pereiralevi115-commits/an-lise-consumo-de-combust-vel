import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { fileName, fileContent } = body;

    if (!fileName || !fileContent) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log(`Processing file: ${fileName}`);

    // Validate file type
    const fileNameLower = fileName.toLowerCase();
    const validTypes = ['.pdf', '.csv', '.xls', '.xlsx'];
    const hasValidType = validTypes.some(type => fileNameLower.endsWith(type));
    
    if (!hasValidType) {
      return Response.json({ error: 'Invalid file type. Please upload PDF, CSV, XLS or XLSX' }, { status: 400 });
    }

    // Upload the file
    const uploadedFile = await base44.integrations.Core.UploadFile({ file: fileContent });
    console.log(`File uploaded: ${uploadedFile.file_url}`);

    // Extract data from PDF
    const extractionSchema = {
      type: 'object',
      properties: {
        monthly_data: {
          type: 'object',
          properties: {
            september: {
              type: 'object',
              properties: {
                liters: { type: 'number' },
                kilometers: { type: 'number' },
                cost: { type: 'number' }
              }
            },
            october: {
              type: 'object',
              properties: {
                liters: { type: 'number' },
                kilometers: { type: 'number' },
                cost: { type: 'number' }
              }
            },
            november: {
              type: 'object',
              properties: {
                liters: { type: 'number' },
                kilometers: { type: 'number' },
                cost: { type: 'number' }
              }
            },
            december: {
              type: 'object',
              properties: {
                liters: { type: 'number' },
                kilometers: { type: 'number' },
                cost: { type: 'number' }
              }
            }
          }
        },
        plants: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              total_cost: { type: 'number' }
            }
          }
        },
        vehicles: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              plate: { type: 'string' },
              kilometers: { type: 'number' }
            }
          }
        },
        drivers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              kilometers: { type: 'number' }
            }
          }
        },
        equipment_types: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              production_m3: { type: 'number' }
            }
          }
        }
      }
    };

    let extractedData;
    try {
      extractedData = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: uploadedFile.file_url,
        json_schema: extractionSchema
      });
    } catch (extractError) {
      console.error('Extraction error:', extractError);
      return Response.json({ 
        error: 'Failed to extract data from file. Please ensure the file format is correct and contains the expected data structure.' 
      }, { status: 400 });
    }

    console.log('Data extracted successfully');

    if (extractedData.status === 'error') {
      console.error('Extraction status error:', extractedData.details);
      return Response.json({ error: `Extraction failed: ${extractedData.details}` }, { status: 400 });
    }

    // Create DieselReport record
    const report = await base44.entities.DieselReport.create({
      file_name: file.name,
      file_url: uploadedFile.file_url,
      uploaded_at: new Date().toISOString(),
      monthly_summary: extractedData.output.monthly_data,
      by_plant: extractedData.output.plants || [],
      by_vehicle: extractedData.output.vehicles || [],
      by_driver: extractedData.output.drivers || [],
      by_equipment_type: extractedData.output.equipment_types || [],
      status: 'completed'
    });

    console.log(`Report created with ID: ${report.id}`);

    return Response.json(report);
  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});