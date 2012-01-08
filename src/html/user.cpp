#include "html.h"
#include "../session.h"
#include "../utils.h"
#include "../account.h"
#include <sstream>

using namespace std;

string Html::userPage(int uid){
    Account user(uid);
    if(!user) return notFound("User");
    stringstream s;
    s << headerFeed(escape(user.name()), user.url() + "/atom");
    s << "<div class=\"user\">"
             "Email: " << escapeEmail(user.email())
             << "<div class=\"notes\">" << format(user.about()) << "</div>"
         "</div>";
    bool edition = Session::user().id() == user.id();
    if(edition)
        s << "<a class=\"more\" href=\"/account\">Edit</a>";
    s << "<h3>Tracks " + feedIcon(user.url() + "/atom") + "</h3>"
      << Html::trackList(Track::byArtist(user.id(), edition), edition ? Html::Edition : Html::Compact);
    if(edition)
        s << uploadForm("/track/new") << Html::comments(Comment::forArtist(uid), "Comments on your tracks");
    s << Html::comments(Comment::forUser(uid)) << Html::commentForm(user.url()+"/comment");
    s << footer();
    return s.str();
}

string Html::userList(const vector<User> &users){
    stringstream s(stringstream::out);
    s << "<ul>";
    for(vector<User>::const_iterator i=users.begin(); i!=users.end(); i++)
        s << "<li><a href=\"" << i->url() << "\">" << escape(i->name()) << "</a></li>";
    s << "</ul>";
    return s.str();
}

string Html::usersPage(){
    return header("Users")
         + searchForm("/users/search")
         + userList(User::list(50))
         + footer();
}

string Html::artistsPage(){
    return header("Artists")
         + searchForm("/users/search")
         + userList(User::listArtists(50))
         + footer();
}

string Html::searchForm(const string &action, const string &q){
    return
        "<form action=\"" + action + "\">"
            "<input type=\"text\" name=\"q\" value=\"" + escape(q) + "\" />"
            "<input type=\"submit\" value=\"Search\" />"
        "</form>";
}

string Html::userSearch(const std::string &q){
    vector<User> res = User::search(q);
    stringstream s;
    s << header("User search")
      << searchForm("/users/search", q);
    if(res.empty())
        s << "No result.";
    else
        s << userList(res);
    s << footer();
    return s.str();
}
