import swaggerJsdoc, { Options } from 'swagger-jsdoc';

const swaggerDefinition: Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '智能標案產生器 API',
      version: '1.0.0',
      description: '智能標案產生器的 RESTful API 服務，提供標書管理、AI 生成和企業資料管理功能',
      contact: {
        name: 'API 支援',
        email: 'support@proposal-generator.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001/api',
        description: '本地開發服務器'
      },
      {
        url: 'https://api.proposal-generator.com/v1',
        description: '生產環境服務器'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.ts'
  ]
};

const swaggerSpec = swaggerJsdoc(swaggerDefinition);

export default swaggerSpec;