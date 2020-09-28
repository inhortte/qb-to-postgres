"use strict";

const fs = require("fs");
const os = require("os");
const R = require("ramda");
const { Client } = require("pg");

const postgresUser = () => {
  let hostname = os.hostname();
  if (
    /tahr/.exec(hostname) ||
    /galactis/.exec(hostname) ||
    /pennanti/.exec(hostname)
  ) {
    return "vdna";
  } else {
    return "polaris";
  }
};

const createThreeSubjectQuotebook = `
CREATE TABLE IF NOT EXISTS three_subject_quotebook (
    id          SERIAL PRIMARY KEY,
    quote       VARCHAR[] NOT NULL,
    author      VARCHAR[] NOT NULL,
    fecha        DATE not null
);
`;

const client = new Client({
  host: "localhost",
  user: postgresUser(),
  database: "leper",
});

const tsqPath =
  "/home/polaris/various-leprosies/draining-the-pond/Three_Subject_Quotebook.txt";

(async () => {
  try {
    await client.connect();
    await client.query(`DROP TABLE IF EXISTS three_subject_quotebook`);
    await client.query(createThreeSubjectQuotebook);

    let tsq;
    try {
      tsq = fs.readFileSync(tsqPath).toString().split(/\n/);
    } catch (err) {
      console.log(`the file could not be read, vole: ${err}`);
      process.exit(1);
    }

    let idx = 0;
    while (idx < tsq.length) {
      if (tsq[idx].trim().length === 0) {
        idx = idx + 1;
        continue;
      }
      let quotes = [];
      let authors = [];
      let date = "1970-1-1";
      let konec = false;
      while (!konec) {
        let _quoteStart = /^"(.+)$/.exec(tsq[idx].trim());
        if (_quoteStart) {
          let [_nic, quote] = _quoteStart;
          let moreQuote = true;
          while (moreQuote) {
            if (/.+"$/.exec(quote)) {
              quotes.push(quote.slice(0, -1).split(/\s+/).join(" "));
              moreQuote = false;
            } else {
              idx = idx + 1;
              quote = `${quote} ${tsq[idx].trim()}`;
            }
          }
          idx = idx + 1;
          let _author = /^-(.+)$/.exec(tsq[idx].trim());
          let [_, authorAndDate] = _author;
          let _aad = /^(.+)\s+\(([\d\/]+)\)$/.exec(authorAndDate);
          if (_aad) {
            let [_nada, author, fecha] = _aad;
            authors.push(author);
            let bastardDate = fecha.split(/\//);
            if (bastardDate.length === 1) {
              date = `${bastardDate[0]}-1-1`;
            } else if (bastardDate.length === 2) {
              date = `${bastardDate[1]}-${bastardDate[0]}-1`;
            } else {
              date = `${bastardDate[2]}-${bastardDate[0]}-${bastardDate[1]}`;
            }
            konec = true;
          } else {
            authors.push(_author[1]);
          }
        }
        idx = idx + 1;
      }
      console.log(
        `QUOTES: ${JSON.stringify(quotes)}\nAUTHORS: ${JSON.stringify(
          authors
        )}\nDATE: ${date}`
      );
      let quotesPart = R.compose(
        (qp) => `ARRAY[${qp}]`,
        R.join(","),
        R.map((quote) =>
          R.compose((quote) => `'${quote}'`, R.replace(/'/g, "''"))(quote)
        )
      )(quotes);
      let authorsPart = R.compose(
        (ap) => `ARRAY[${ap}]`,
        R.join(","),
        R.map((author) =>
          R.compose((author) => `'${author}'`, R.replace(/'/g, "''"))(author)
        )
      )(authors);
      let query = `insert into three_subject_quotebook (quote, author, fecha) values(${quotesPart}, ${authorsPart}, date '${date}');`;
      console.log(`THE QUERY: ${query}`);
      await client.query(query);
    }
    await client.end();
  } catch (err) {
    throw err;
  }
})();
