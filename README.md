## Introduction

This assignment aims at creating a POST API to add a new
publication. The endpoint is specified as follows:

* Endpoint `POST /publications`
* Request payload example:
```
{
    title: 'Lorem ipsum,
    publish_year: 1999,
    author_ids: ['5678', '9876']
}
```
* Response payload example:
```
{
    id: '1234',
    title: 'Lorem ipsum,
    publish_year: 1999,
    authors: [
        {
            name: 'John doe',
            id: '5678'
        },
        {
            name: 'Jane doe',
            id: '9876'
        }
    ]
}
```

Initial setup for this project already contains a sqlite3
database with `Authors`, `Publications` and 
`AuthorPublications` initialaized with dummy vaLues.

Additionally, a `GET` method is defined for `/publications`
that returns a collection of Publication object. If a 
`publishYear` parameter is defined, then data for only 
the given year is returned.

NOTE: A minor bug is found in the code:
```
if(req.query.PublishYear) {
    queryStr += ` WHERE PUB.PublishYear=${req.query.PublishYear}`
} 
```
should be changed to
```
if(req.query.publishYear) {
    queryStr += ` WHERE PUB.PublishYear=${req.query.publishYear}`
}
```

## Setup
```
npm install
npm start
```

## Data Structure
* The following interfaces are defined:
    * `PublicationsPostQueryRequest` for the POST parameters
    ```
      interface PublicationsPostQueryRequest {
        title: string;
        publish_year: number;
        author_ids: number[];
      }  
    ```
    * `PublicationsPostQueryResponse` for the response to 
      POST parameters
    ```
      interface PublicationsPostQueryResponse {
        id: string,
        title: string;
        publish_year: number;
        authors: AuthorTableData[];
      }
    ```
    * `AuthorTableData` for the output from Authors table
    ```
      interface AuthorTableData {
        id: number,
        name: string
      }
    ```
    * `AuthorInfo` as below
    ```
      interface AuthorInfo {
        [key: string] : AuthorTableData
      }
    ```
  
## Functions
The following functions are defined for performing several
tasks
* `fetchAuthorsInfo()`, `addAuthorsInfo()` and 
  `addAuthorsInfoArr()` are defined for reading data from
  `Authors` table, as well as for writing new authors'
  info to the table.
* `fetchLastPubId()` and `insertNewPublication()` are 
  defined for writing new publication to the 
  `Publications` table.
* `fetchLastAuthorPublicationId()` is defined for 
  assigning authorPublication id for the new publication.
* `checkPublicationExist()` checks if a given title on a 
  given year is already published. If it is published, 
  then avoid writing to database.
  
## Curl Example

For Unix-like systems,
```
curl -X POST -H "Content-Type: application/json" \
-d '{"title": "Lorem ipsum","publish_year": "1999", "author_ids":["5678", "9876"]}' \
http://localhost:8000/publications
```

For Windows, 
```
$url = "http://localhost:3000/publications"
$body = '{"title": "Lorem ipsum","publish_year": "1999", "author_ids":["5678", "9876"]}'
$headers = @{
    "Content-Type" = "application/json"
}

$response = Invoke-WebRequest -Uri $url -Method Post -Body $body -Headers $headers
$response.Content
```

If success, response
```
{
    "id":"201",
    "title":"Lorem ipsum",
    "publish_year":"1999",
    "authors":[{
        "id":"5678",
        "name":"Brooke Murazik II"
    },
    {
        "id":"9876",
        "name":"Terry Cummings"
    }]
}
```

## Running application as docker
The `Dockerfile` contains the relevant commands to build a Docker image. This file is structured as follows:

1. Build Stage: Installs all dependencies (including devDependencies) and builds the application. For TypeScript projects, this typically involves compiling 
TypeScript to JavaScript. From the terminal, run the command
```
docker build -t publication_dockerized .
```

2. Run Stage: Creates a lean final image by only including production dependencies and the built application from the first stage.
```
docker run -p 3000:8000 publication_dockerized
```
Note that the above statement as Port 3000 as the external port (the host machine), and Port 8000 as the internal port (the one the
application listens to within the container). This was an external port is mapped to an internal port.

## Deploying the application to a Kubernetes cluster
The dockerized application is deployed in a Kubernetes cluster. In this example, the Kubernetes is running locally on Windows, and Minikube
is used for the deployment.

Follow the steps:

1. Start the Minikube in a terminal:
```
minikube start
```

2. Set Docker environment to Minikube:
```
minikube docker-env | Invoke-Expression
```

3. Build the docker image
```
docker build -t publication_dockerized .
```

4. Create a Kubernetes deployment
```
kubectl apply -f publications-deployment.yaml
```

5. Expost the deployment as a service
To access the application fro outside the Kubernetes virtual network, create a service that exposes it:
```
kubectl expose deployment publications-deployment --type=NodePort --port=8000
```

6. Access the application
Get the URL to access the application
```
minikube service publications-deployment --url
```

## Scaling
The desired number of replicas could be specified:
```
kubectl scale deployment publications-deployment --replicas=3
```
Or, update  the `publications-deployment.yaml` file by modifying the `replicas` field, and apply the change:
```
kubectl apply -f <your-deployment-file.yaml>
```

## Autoscaling
The Horizontal Pod Autoscaler (HPA) can be used for the dynamic scaling based on the actual load. 
The HPA automatically scales the number of Pod replicas in a deployment based on observed CPU
utilization or other selectedmetrics.

Ensure that metrics-server is deployed in the cluster:
```
minikube addons enable metrics-server
```
Then, to automatically scale the deployment based on CPU usage
```
kubectl autoscale deployment publications-deployment --cpu-percent=50 --min=1 --max=5
```
This example sets the HPA to adjust the number of replicas so that each Pod targets using no more than 50% of its allocated CPU, with a minimum of 1 and a maximum of 5 replicas.