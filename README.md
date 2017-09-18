# API Gateway v2

Ermöglicht es, dass alle Microservices sich hinter dem Port 80 verstecken.

Dazu muss das API Gateway auf Port 80 laufen (oder hinter nginx gestellt werden).

## Verbindung zu Consul (Service Registry)

Über seine Verbindungen zu Eureka kennt das API-Gateway die Services. Aus
der URL wird abgeleitet, welcher Service gemeint ist:

`/api/v1/<Service-Name>`

Bei Consul müssen die Services in folgender Form registriert werden:

```<Service-Name>-<Version> z. B. shopping-cart-1.0.12```

Bei der Weiterleitung wird nur die Major-Version berücksichtigt - d. h. insgesamt
darf es jeweils nur eine Major-Version gleichzeitig als Instanzen geben. Es können
jedoch mehrere Major-Versionen eines Service gleichzeitig betrieben werden.

## Verbindung zum Konfigurations-Server (Spring Cloud Config)

Die Konfiguration kommt aus git (api-gateway). Momentan git es dort keine
relevanten Parameter. 
In der Zukunft sollen dort **API-Mappings** gepflegt werden
können: z. B. `/api/v1/einkaufswagen --> /api/v1/shopping-cart`

## Routing: Auto-Mapping vs. Designed API-Routes

Jeder Service kann über das dritte Url-Segment angesprochen werden `/api/v1/service-name`(=Auto-Mapping).
Auto-Mapping ist dann sinnvoll, wenn die URLs keine besondere Bedeutung transportieren und man die
Implementierung nicht vor der Welt verstecken möchte. Sobald man die Urls nach außen designen möchte, müssen
Routen verwendet werden: `/api/order --> /api/v1/shopping-cart` - die Route ist ein einfaches Präfix-Mapping.
