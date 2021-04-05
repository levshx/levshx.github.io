var app = angular.module("app", ["ngRoute"]);

app.config(function($routeProvider) {    
    console.log("Routing to: "+$routeProvider.path());
    $routeProvider
    .when("/", {
        templateUrl : "pages/main.htm"
    })
    .when("/projects", {
        templateUrl : "pages/projects.htm"
    })
    .when("/contact", {
        templateUrl : "pages/contact.htm"
    })
    .otherwise({
        template: "<h1>Page not found<h1><br><h2>Error 404<h2>"
    })
});
