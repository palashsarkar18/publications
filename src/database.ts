
import { faker } from "@faker-js/faker";
import sqlite3 from 'sqlite3';

export const db = new sqlite3.Database(':memory:');

const getRandomSubarray = <T>(arr: T[], size: number) => {
    var shuffled = arr.slice(0), i = arr.length, min = i - size, temp, index;
    while (i-- > min) {
        index = Math.floor((i + 1) * Math.random());
        temp = shuffled[index];
        shuffled[index] = shuffled[i];
        shuffled[i] = temp;
    }
    return shuffled.slice(min);
}

const getRandomInt = (min: number, max: number) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min);
  }


export const initializeDb = () => {

    db.serialize(() => {

        db.run(`CREATE TABLE Authors(Id INTEGER PRIMARY KEY,
                                     Name TEXT);`);
        db.run(`CREATE TABLE Publications (Id INTEGER PRIMARY KEY,
                                            Title TEXT,
                                            PublishYear INTEGER);`);

        db.run(`CREATE TABLE AuthorPublications (Id INTEGER PRIMARY KEY,
                                                AuthorId INTEGER NOT NULL,
                                                PublicationId INTEGER NOT NULL,
                                                FOREIGN KEY(AuthorId) REFERENCES Authors(Id),
                                                FOREIGN KEY(PublicationId) REFERENCES Publications(Id));`);

        const years = [ 1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 2000 ];


        const words = ["lorem", "ipsum", "dolor", "sit", "amet", "consectetuer",
                    "adipiscing", "elit", "sed", "diam", "nonummy", "nibh", "euismod",
                    "tincidunt", "ut", "laoreet", "dolore", "magna", "aliquam", "erat"];

        const wordCount = (Math.floor(Math.random() * 10));

        const authors: {Id: number; Name: string}[] = [];

        for(let x = 0; x < 100; x++) {
            const authId = x + 1;
            const name = faker.person.fullName();
            const query = `INSERT INTO Authors (Id, Name) VALUES (${authId}, "${name}");`;
            db.run(query);

            authors.push({
                Name: name,
                Id: authId
            });
        }

        let paCounter = 1;

        for(let x = 0; x < 200; x++) {
            const pubId = x + 1;
            const randomYear = years[Math.floor(Math.random() * years.length)];
            const pubTitle = getRandomSubarray(words, wordCount).join(' ');
            const query = `INSERT INTO Publications (Id, Title, PublishYear) VALUES (${pubId}, "${pubTitle}", ${randomYear})`;
            db.run(query);
            const authorCount = getRandomInt(1, 4);
            const pubAuthors = getRandomSubarray(authors, authorCount);
            for(let y = 0; y < pubAuthors.length; y++) {
                const paId = paCounter + y;
                const query = `INSERT INTO AuthorPublications
                                (Id, AuthorId, PublicationId) VALUES (${paId + 1}, ${pubAuthors[y].Id}, ${pubId})`
                db.run(query);
                paCounter = paId;
            }
            paCounter++;
        }

    });

};