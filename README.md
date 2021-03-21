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
```
curl -X POST -H "Content-Type: application/json" \
-d '{"title": "Lorem ipsum","publish_year": "1999", "author_ids":["5678", "9876"]}' \
http://localhost:8000/publications
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




