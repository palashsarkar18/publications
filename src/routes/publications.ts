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

declare interface PublicationsPostQueryResponse {
    id: string,
    title: string;
    publish_year: number;
    authors: AuthorTableData[];
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

export function configurePublicationRoutes(router: Router) {

    router.post<{ Querystring: PublicationsPostQueryRequest }>('/', async (req, res) => {
        const {title, publish_year, author_ids} = req.body;
        let authors: AuthorInfo = {};
        let pubId: number;
        const isExist = await checkPublicationExist(title, publish_year, author_ids);
        if(isExist) {
            const message = `Publication with title ${title}, publish_year ${publish_year} already exists`
            // message += `and author_ids ${author_ids} already exists`
            return res.status(400).send({status: message})
        } else {
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
                        return addAuthorsInfoArr(new_author_ids)
                    }
                })
                .then(newAuthorsResult => {
                    for(const id in newAuthorsResult) {
                        authors[id] = newAuthorsResult[id];
                    }
                    return fetchLastPubId();
                })
                .then(max_pubId => {
                    pubId = max_pubId + 1;
                    return insertNewPublication(pubId, title, publish_year);
                })
                .then(() => {
                    return fetchLastAuthorPublicationId();
                })
                .then(max_paId => {
                    let paCounter = max_paId + 1;
                    const authors_id = Object.keys(authors);
                    for (let y = 0; y < authors_id.length; y++) {
                        const paId = paCounter + y;
                        const query = `INSERT INTO AuthorPublications
                                (Id, AuthorId, PublicationId) VALUES (${paId + 1}, ${parseInt(authors_id[y])}, ${pubId})`
                        db.run(query);
                        paCounter = paId;
                    }
                    const output: PublicationsPostQueryResponse = {
                        id: pubId.toString(),
                        title: title,
                        publish_year: publish_year,
                        authors: []
                    }
                    authors_id.forEach(id => {
                        output.authors.push(authors[id]);
                    })
                    return Promise.resolve(output);
                })
                .then(output => {
                    return res.status(200).send(output);
                })
                .catch(err => {
                    console.error(err);
                    return res.status(500).send({status: 'Internal Server Error'})
                })
        }
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

function fetchAuthorsInfo(author_ids: string[]): Promise<AuthorInfo> {
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
                result.forEach(content => {
                    authors[content.id.toString()] = content;
                })
                resolve(authors);
            })
            .catch(err => {
                reject(err);
            })
    })
}

function addAuthorsInfo(author_id: number): Promise<AuthorTableData> {
    /**
     * Add authors' info to the Authors table
     */
    return new Promise<AuthorTableData>((resolve, reject) => {
        try {
            const name = faker.name.findName();
            const query = `INSERT INTO Authors (Id, Name) VALUES (${author_id}, "${name}");`;
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

function addAuthorsInfoArr(author_ids: string[]): Promise<AuthorInfo> {
    /**
     * Add array of authors' info to the Author table
     */
    return new Promise<AuthorInfo>((resolve, reject) => {
        const new_authors: AuthorInfo = {};
        const p: Promise<any>[] = [];
        author_ids.forEach(id => {
            p.push(addAuthorsInfo(parseInt(id)));
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

function fetchLastPubId(): Promise<number> {
    /**
     * Fetch the last pubId from Publications table
     */
    return new Promise<number>((resolve,reject) => {
        const query = `SELECT MAX(Id) FROM Publications`;
        fetchData(query)
            .then(result => {
                resolve(result[0]['MAX(Id)']);
            })
            .catch(err => {
                reject(err);
            })
    })
}

function insertNewPublication(pubId: number, title: string, publish_year: number): Promise<void> {
    /**
     * Add new publication to the publication table
     */
    return new Promise<void>((resolve) => {
        const query = `INSERT INTO Publications (Id, Title, PublishYear) VALUES (${pubId}, "${title}", ${publish_year})`;
        db.run(query);
        resolve();
    })
}

function fetchLastAuthorPublicationId(): Promise<number> {
    /**
     * Fetch the last authorPublication Id from AuthorPublications table
     */
    return new Promise<number>((resolve,reject) => {
        const query = `SELECT MAX(Id) FROM AuthorPublications`;
        fetchData(query)
            .then(result => {
                resolve(result[0]['MAX(Id)']);
            })
            .catch(err => {
                reject(err);
            })
    })
}

async function checkPublicationExist(title: string, publish_year: number, author_ids: string[]): Promise<boolean> {
    /**
     * Check if a publication with same title, publish_year and authors exist
     */
    return new Promise<boolean>((resolve, reject) => {
        let auth_ids_string_for_query = "";
        author_ids.forEach(id => {
            auth_ids_string_for_query += parseInt(id) + ",";
        })
        auth_ids_string_for_query = auth_ids_string_for_query.slice(0, -1);

        const queryStr = `SELECT PUB.Title title, PUB.PublishYear publish_year, AUTH.Id id, 
                PUB.id pubId, AP.PublicationId apId 
                FROM Publications PUB
                INNER JOIN AuthorPublications AP ON AP.PublicationId=PUB.Id
                INNER JOIN Authors AUTH ON AUTH.Id in (${auth_ids_string_for_query})
                WHERE PublishYear=${publish_year} AND Title="${title}"`
        // AND AUTH.Id in (${auth_ids_string_for_query})

        fetchData(queryStr)
            .then(result => {
                if(result.length == 0) {
                    resolve(false);
                } else resolve(true);
            })
            .catch(err => {
                reject(err);
            })
    })

}



function fetchData(query: string): Promise<any> {
    /**
     * Fetch data from the table mentioned in query
     */
    return new Promise<any>((resolve, reject) => {
        db.all(query, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    })
}