import { Router } from "express";
import { db } from "../database";
import faker from "faker";

declare interface AuthorTableData {
    id: number,
    name: string
}

declare interface AuthorInfo {
    [key: string] : AuthorTableData
}

declare interface PublicationsPostQueryRequest {
    title: string;
    publish_year: number;
    author_ids: number[];
}

declare interface PublicationSqlResponse {
    Id: number;
    Title: string;
    PublishYear: number;
    AuthorName: string;
    AuthorId: number;
}

declare interface PublicationApiResponse {
    Id: number;
    Title: string;
    PublishYear: number;
    Authors: { Name: string; Id: number }[];
}

const debugStatus = false;

/*

curl -X POST -H "Content-Type: application/json" \
-d '{"title": "Lorem ipsum","publish_year": "1999", "author_ids":["5678", "9876"]}' \
http://localhost:8000/publications

curl -X POST -H "Content-Type: application/json" \
-d '{"title": "Lorem ipsum","publish_year": "1999", "author_ids":["5", "9"]}' \
http://localhost:8000/publications

*/

export function configurePublicationRoutes(router: Router) {

    router.post<{ Querystring: PublicationsPostQueryRequest }>('/', async (req, res) => {
        const {title, publish_year, author_ids} = req.body;
        let authors: AuthorInfo = {};
        let pubId = -1;
        fetchAuthorsInfo(author_ids)
            .then(authorsResult => {
                authors = authorsResult;
                if (Object.keys(authors).length === author_ids.length) {
                    return Promise.resolve({});
                } else {
                    const new_author_ids: string[] = [];
                    author_ids.forEach(id => {
                        if (!authors[id]) {
                            new_author_ids.push(id);
                        }
                    });
                    if (debugStatus) console.log(`Following ids are to be added: ${new_author_ids}`)
                    return addAuthorsInfoArr(new_author_ids)
                }
            })
            .then(() => {
                return res.status(200).send({status: 'OK'});
            })
            .catch(err => {
                console.error(err);
                return res.status(500).send({status: 'Internal Server Error'})
            })
    })

    router.get<null, PublicationApiResponse[], null, { PublishYear: string }>('/', async (req, res) => {

        let queryStr = `SELECT PUB.*, AUTH.Name as 'AuthorName', AUTH.Id as 'AuthorId' FROM Publications PUB
                    INNER JOIN AuthorPublications AP ON AP.PublicationId=PUB.Id
                    INNER JOIN Authors AUTH ON AUTH.Id=AP.AuthorId`

        if(req.query.PublishYear) {
            queryStr += ` WHERE PUB.PublishYear=${req.query.PublishYear}`
        } else {
            queryStr += ';';
        }

        db.all(queryStr, (err, rows: PublicationSqlResponse[]) => {
            if (rows) {
                const dataResp = rows.reduce((prev, curr) => {
                    const idx = prev.findIndex(p => p.Id === curr.Id)
                    if(idx > -1) {
                        prev[idx].Authors.push({Name: curr.AuthorName, Id: curr.AuthorId});
                    } else {
                        prev.push({
                            Id: curr.Id,
                            Title: curr.Title,
                            PublishYear: curr.PublishYear,
                            Authors: [{Name: curr.AuthorName, Id: curr.AuthorId}]
                        })
                    }
                    return prev;
                }, [] as PublicationApiResponse[]);
                res.status(200).json(dataResp);
            } else {
                return res.status(400).send();
            }
        });
    });
}

function fetchAuthorsInfo(author_ids: string[]) {
    /**
     * Fetch information of authors listed in author_id from Authors table
     */
    return new Promise<AuthorInfo>((resolve, reject) => {
        const authors: AuthorInfo = {};
        let auth_ids_string_for_query = "";
        author_ids.forEach(id => {
            auth_ids_string_for_query += parseInt(id) + ",";
        })
        auth_ids_string_for_query = auth_ids_string_for_query.slice(0, -1);
        const query = `SELECT Id id, Name name FROM Authors WHERE Id IN (${auth_ids_string_for_query})`
        fetchData(query)
            .then(result => {
                if(debugStatus) console.log(`result: ${JSON.stringify(result)}`);
                result.forEach(content => {
                    if(debugStatus) console.log(`${content.id.toString()} : ${JSON.stringify(content)}`)
                    authors[content.id.toString()] = content;
                })
                if(debugStatus) console.log(authors);
                resolve(authors);
            })
            .catch(err => {
                reject(err);
            })
    })
}

function addAuthorsInfo(author_id) {
    /**
     * Add authors' info to the Authors table
     */
    return new Promise<AuthorTableData>((resolve, reject) => {
        try {
            const name = faker.name.findName();
            const query = `INSERT INTO Authors (Id, Name) VALUES (${author_id}, "${name}");`;
            if(true) console.log(query);
            db.run(query);
            resolve({
                id: author_id, name
            });
        }
        catch (err) {
            reject(err);
        }
    })
}

function addAuthorsInfoArr(author_ids: string[]) {
    /**
     * Add array of authors' info to the Author table
     */
    return new Promise<AuthorInfo>((resolve, reject) => {
        const new_authors: AuthorInfo = {};
        const p: Promise<any>[] = [];
        author_ids.forEach(id => {
            p.push(addAuthorsInfo(id));
        })
        Promise.all(p)
            .then(authors_arr => {
                authors_arr.forEach(author => {
                    new_authors[author.id.toString()] = author
                });
                resolve(new_authors);
            })
            .catch(err => {
                reject(err)
            })
    })
}

function fetchData(query: string) {
    /**
     * Fetch data from the table mentioned in query
     */
    return new Promise<any>((resolve, reject) => {
        if(debugStatus) console.log(query);
        db.all(query, (err, row) => {
            if (err) {
                console.error(err.message);
                reject(err);
            } else {
                resolve(row);
            }
        });
    })
}