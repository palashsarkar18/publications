import { Router } from "express";
import { db } from "../database";

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