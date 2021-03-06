#include "log.h"
#include <account/session.h>
#include <iostream>
#include <unistd.h>

using namespace std;

void log(const std::string &msg){
    time_t now;
    time(&now);
    struct tm *utc = gmtime(&now);
    char timestamp[100];
    strftime(timestamp, 200, "[%F %T %Z]", utc);
    cerr << timestamp
         << " " << getpid() << ": "
         << msg;
    if(Session::user())
        cerr << " [user: " << Session::user().id << "]";
    cerr << std::endl;
}
