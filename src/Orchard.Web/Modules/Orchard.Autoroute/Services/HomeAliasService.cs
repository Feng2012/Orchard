﻿using System;
using System.Web.Routing;
using Orchard.Alias;
using Orchard.ContentManagement;

namespace Orchard.Autoroute.Services {
    public class HomeAliasService : IHomeAliasService {
        private readonly IAliasService _aliasService;
        private readonly IContentManager _contentManager;
        private const string AliasSource = "Autoroute:Home";
        private const string HomeAlias = "";

        public HomeAliasService(IAliasService aliasService, IContentManager contentManager) {
            _aliasService = aliasService;
            _contentManager = contentManager;
        }

        public RouteValueDictionary GetHomeRoute() {
            return _aliasService.Get(HomeAlias);
        }

        public int? GetHomePageId() {
            var homePageRoute = GetHomeRoute();
            var homePageIdValue = homePageRoute != null && homePageRoute.ContainsKey("id") ? (string)homePageRoute["id"] : default(string);
            var homePageId = TryParseInt32(homePageIdValue);

            return homePageId;
        }

        public IContent GetHomePage(VersionOptions version = null) {
            var homePageId = GetHomePageId();
            var homePage = homePageId != null ? _contentManager.Get(homePageId.Value, version ?? VersionOptions.Published) : default(IContent);

            return homePage;
        }

        public void PublishHomeAlias(IContent content) {
            var routeValues = _contentManager.GetItemMetadata(content).DisplayRouteValues;
            PublishHomeAlias(routeValues);
        }

        public void PublishHomeAlias(string route) {
            _aliasService.DeleteBySource(AliasSource);
            _aliasService.Set(HomeAlias, route, AliasSource);
        }

        public void PublishHomeAlias(RouteValueDictionary route) {
            _aliasService.DeleteBySource(AliasSource);
            _aliasService.Set(HomeAlias, route, AliasSource);
        }

        private int? TryParseInt32(string value) {
            int i;

            if (String.IsNullOrWhiteSpace(value) || !Int32.TryParse(value, out i))
                return null;
            
            return i;
        }
    }
}