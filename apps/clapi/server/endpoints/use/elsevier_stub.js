
// elsevier API client

// http://api.elsevier.com/documentation/FullTextRetrievalAPI.wadl
// http://tdmsupport.crossref.org/researchers/
// http://clickthroughsupport.crossref.org/
// https://www.elsevier.com/__data/assets/pdf_file/0018/83403/TDM_Elsevier_Licenser_2014.pdf

// using elsevier via crossref click-through requires that an individual researcher sign up via orcid for a token
// then the token is compared against what the publishers can check, which shows what was agreed to by the researcher 
// when the token was issued. This has to be done on a per-publisher basis. Making it essentially useless for our use case.
// (we have the right to read it, so we can mine it)

// Not much point implementing this - if Hargreaves states we have the right to mine what we can read, then just follow the DOI 
// link to the publication from within an IP range that has the right to do so, and then text mine the pdf.

// So, back to resolving DOIs and getting PDFs...

// elsevier can work by resolving doi and getting page, then getting the .pdf link from that page content, then 
// following that url WITH the cookies set on the initial page load and FROM WITHIN an IP range that allows it
// if not in such a range, the initial resolved page will not contain the pdf link

// so for the doi search, given a doi try resolving it to the page
// if there is a page that is elsevier, look for a PII number in the redirect url
// with a PII number a call can be made like: http://api.elsevier.com/content/article/PII:S0191886909000877?httpAccept=text/xml
// which returns xml metadata about the article
// accessing the article page from within an IP range that is authorised will yield a pdf link like:
// http://www.sciencedirect.com/science/article/pii/S0191886909000877 yields
// http://www.sciencedirect.com/science/article/pii/S0191886909000877/pdfft?md5=25fb6461c7b1ebe114acb2cd5ab91ddd&pid=1-s2.0-S0191886909000877-main.pdf

// so we can read some article metadata from the api page
// then look for access to the pdf via the page itself
// and if we have that access link, and the cookies delivered when the page is accessed, should be able to get the fulltext pdf from the last link

// https://gist.github.com/Blahah/78f7a7f6f91a5ec5f49c

// now how to fulltext search elsevier? worth bothering?

// also how to search for publication dates and ranges. Again worth bothering or just get from crossref?

// getting and using cookies in node:
// https://newspaint.wordpress.com/2015/09/06/how-to-get-cookies-from-node-js-http-response/
// http://blog.nodejitsu.com/sessions-and-cookies-in-node/




