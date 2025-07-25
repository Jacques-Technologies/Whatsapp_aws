# AWS Backend para WhatsApp GPT Bot

Este repositorio proporciona un backend reutilizable en AWS para integrar un bot de WhatsApp potenciado por GPT. Utiliza AppSync (GraphQL), DynamoDB, Lambda y API Gateway (webhook) para enviar y recibir mensajes, suscripciones en tiempo real y persistencia de datos.

---

## Tabla de Contenidos

1. [Descripción](#descripción)  
2. [Requisitos](#requisitos)  
3. [Estructura del Proyecto](#estructura-del-proyecto)  
4. [Configuración de Entorno](#configuración-de-entorno)  
5. [Despliegue con AWS SAM](#despliegue-con-aws-sam)  
6. [Uso de la API GraphQL](#uso-de-la-api-graphql)  
7. [Ejemplos de Webhook de WhatsApp](#ejemplos-de-webhook-de-whatsapp)  
8. [Esquema de DynamoDB](#esquema-de-dynamodb)  
9. [Eliminación de Recursos](#eliminación-de-recursos)  
10. [Contribuciones](#contribuciones)  

---

## Descripción

Este backend en AWS facilita:

- Recibir mensajes de WhatsApp a través de un webhook (API Gateway + Lambda).  
- Persistir mensajes entrantes y salientes en DynamoDB.  
- Exponer una API GraphQL con AppSync para:
  - Consultar mensajes (`getMessages`).  
  - Enviar mensajes (`sendMessage`).  
  - Procesar respuestas del bot y guardarlas (`receiveMessage`).  
  - Suscribirse a nuevos mensajes en tiempo real (`onNewMessage`).  

---

## Requisitos

- Node.js ≥ 14.x  
- AWS CLI configurado con credenciales válidas  
- AWS SAM CLI instalado  
- Cuenta AWS con permisos para crear:  
  - Lambdas, DynamoDB, AppSync, API Gateway, IAM  

---

## Estructura del Proyecto

```
.
├── README.md
├── template.yaml              # Plantilla SAM/CloudFormation
├── schema.graphql             # Definición de tipos y operaciones GraphQL
├── resolvers/                 # Plantillas VTL para AppSync
│   ├── Mutation.receiveMessage.req.vtl
│   ├── Mutation.receiveMessage.res.vtl
│   ├── Mutation.sendMessage.req.vtl
│   ├── Mutation.sendMessage.res.vtl
│   ├── Query.getMessages.req.vtl
│   ├── Query.getMessages.res.vtl
│   ├── Query.getMessages.res.vtl
│   └── Subscription.onNewMessage.res.vtl
└── src/
    ├── webhook/               # Lambda para WhatsApp Webhook
    │   ├── app.js
    │   └── package.json
    └── sendMessage/           # Lambda para enviar mensajes vía AppSync
        ├── app.js
        └── package.json
```

---

## Configuración de Entorno

Antes de desplegar, exporta en tu terminal o define en tu CI/CD las siguientes variables:

- `WHATSAPP_ACCESS_TOKEN` : Token de acceso de tu cuenta de WhatsApp Business.  
- `WHATSAPP_PHONE_NUMBER_ID`: ID de número de teléfono de WhatsApp.  
- `WHATSAPP_VERIFY_TOKEN`   : Token de verificación para validar webhook.  

Estas variables se pasarán automáticamente al desplegar con SAM.

---

## Despliegue con AWS SAM

1. Instalar dependencias de cada función Lambda:

   ```bash
   cd src/webhook && npm install
   cd ../sendMessage && npm install
   cd ../../
   ```

2. Desplegar la pila con SAM:

   ```bash
   sam deploy \
     --template-file template.yaml \
     --stack-name whatsapp-gpt-bot \
     --parameter-overrides \
       AccessTokenParameter=$WHATSAPP_ACCESS_TOKEN \
       PhoneNumberIdParameter=$WHATSAPP_PHONE_NUMBER_ID \
       VerifyTokenParameter=$WHATSAPP_VERIFY_TOKEN \
       AppSyncApiUrlParameter=<AppSyncApiUrl> \
       AppSyncApiKeyParameter=<AppSyncApiKey> \
     --capabilities CAPABILITY_IAM
   ```

3. Configura la URL de webhook en WhatsApp Business:

   ```
   https://<API_GATEWAY_URL>/Prod/webhook
   ```
   WhatsApp verificará enviando un `GET` con `hub.challenge`.

---

## Uso de la API GraphQL

- **Endpoint**: `https://<AppSyncApiUrl>/graphql`  
- **API Key**: `<AppSyncApiKey>` (en header `x-api-key`)

Operaciones disponibles:

1. **Query – getMessages**

   ```graphql
   query GetMessages($limit: Int!) {
     getMessages(limit: $limit) {
       id
       sender
       recipient
       content
       timestamp
     }
   }
   ```

2. **Mutation – sendMessage**

   ```graphql
   mutation SendMessage($to: String!, $text: String!) {
     sendMessage(to: $to, text: $text) {
       id
       status
     }
   }
   ```

3. **Mutation – receiveMessage**

   (Invocada internamente tras recibir webhook)

4. **Subscription – onNewMessage**

   ```graphql
   subscription OnNewMessage {
     onNewMessage {
       id
       sender
       content
       timestamp
     }
   }
   ```

---

## Ejemplos de Webhook de WhatsApp

### Mensaje entrante

```json
{
  "object": "whatsapp_business_account",
  "entry": [{ "changes": [{ "value": {
    "messaging_product": "whatsapp",
    "contacts":[{"profile":{"name":"Juan"},"wa_id":"123"}],
    "messages":[{"from":"123","id":"wamid.ID","timestamp":"1620229022","text":{"body":"Hola"},"type":"text"}]
  },"field":"messages"}]}]
}
```

### Confirmación de lectura

```json
{
  "object": "whatsapp_business_account",
  "entry": [{ "changes": [{ "value": {
    "statuses":[{"id":"wamid.ID","status":"read","timestamp":"1620229023","recipient_id":"MY_NUMBER"}]
  },"field":"messages"}]}]
}
```

---

## Esquema de DynamoDB

- **Tabla**: `WhatsAppMessages`  
- **Clave primaria**: `id` (String)  
- **Índice secundario** (opcional): `timestamp` para ordenar por fecha  
- **Atributos**:  
  - `sender` (String)  
  - `recipient` (String)  
  - `content` (String)  
  - `timestamp` (String)  

---

## Eliminación de Recursos

Para desmontar la infraestructura creada:

```bash
sam delete --stack-name whatsapp-gpt-bot --no-prompts
```

---

## Contribuciones

Se aceptan pull requests para:

- Mejorar plantillas VTL  
- Añadir validaciones o logging  
- Integración con otros servicios (e.g. S3, SNS)  

Lee [CONTRIBUTING.md](CONTRIBUTING.md) (si existe) para más detalles.

---


