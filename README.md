# Digital Enterprise API

This Service deals with forms submissions

# Group Submissions API

## Get submissions [/submissions]
These endpoints have to do with the event data uploaded by RH Marketing Operations

### Retrieve submissions [GET]
Endpoint to obtain the submission objects
+ Response 200 (application/json)
    + Body
    {
      "code": "OK",
      "submissions": [
        {
          "_id": "5832ed2ccd864cde6ea0eada",
          "formName": "Digital Enterprise Feedback Form v1.0",
          "formId": "5831fc0306037825636b3e17",
          "fields": [
            {
              "name": "Qué tal fue la experiencia?",
              "type": "radio",
              "values": [
                "Excelente"
              ]
            },
            {
              "name": "Repetiría?",
              "type": "radio",
              "values": [
                "Sí"
              ]
            },
            {
              "name": "Today's Date",
              "type": "dateTime",
              "values": [
                "2016-11-21 13:48:40"
              ]
            }
          ]
        }
      ]
    }
