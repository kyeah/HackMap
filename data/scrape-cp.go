package main

import (
        "encoding/csv"
        "fmt"
        "os"
	"strconv"
	"strings"
        "sync"
        "github.com/PuerkitoBio/goquery"
)

func month_to_int(s string) int64 {
	months := []string{"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"}

	for i := 0; i < 12; i++ {
		if months[i] == s {
			return int64(i)
		}
	}
	return -1
}

func main() {
        csvfile, err := os.Create("challengepost.csv")
        if err != nil {
                fmt.Println("Error:", err)
                return
        }
        defer csvfile.Close()

        writer := csv.NewWriter(csvfile)
	
        var wg sync.WaitGroup
        wg.Add(92)
        for i := 1; i <= 92; i++ {
                go func(page int) {
                        defer wg.Done()
                        url := fmt.Sprintf("http://challengepost.com/hackathons?challenge_type=all&page=%v", page) + "&search=&sort_by=Recently+Added&utf8=%E2%9C%93"
                        doc, err := goquery.NewDocument(url)
                        if err != nil {
                                fmt.Printf("FAILED\n")
                        }

                        // Find each hackathon
                        doc.Find("article").Each(func(i int, s *goquery.Selection) {
				link := s.Find("a").First()
                                href, exists := link.Attr("href")
                                if !exists {
                                        fmt.Printf("NO HREF\n")
                                }

                                synopsis := s.Find(".challenge-synopsis").First()
				name := synopsis.Find(".content .title").Text()
				image, _ := synopsis.Find(".challenge-logo img").Attr("src")
				location := synopsis.Find(".content .challenge-location").First().Text()
				description := synopsis.Find(".content .challenge-description").Text()
				date := s.Find(".date-range").First().Text()
				
				var city string
				var state string
				var country string

				location = strings.Trim(location, " \t\n")
				name = strings.Trim(name, " \t\n")
				image = strings.TrimLeft(image, "//")
				description = strings.Trim(description, " \t\n")
				
				if location != "" {
					arr := strings.SplitN(location, ",", 3)
					if len(arr) > 0 {
						city = strings.Trim(arr[0], " ")
					}
					if len(arr) > 1 {
						state = strings.Trim(arr[1], " ")
					}
					if len(arr) > 2 {
						country = strings.Trim(arr[2], " ")
					}
				}

                                fmt.Printf("href: %s\nname: %s\nlocation: %s\ndate: %s\nimage: %s\ndescription: %s\ncountry: %s\n", href, name, location, date, image, description, country)
				
				var timestamp int64
				var year string
				if date != "" {
					year = date[len(date)-4: len(date)]
					date_parse, _ := strconv.ParseInt(year, 0, 32)
					stuff_parse := month_to_int(date[0:3])
					timestamp = 12*(date_parse - 2011) + stuff_parse
				}

				// Write csv
				item := []string{href, name, image, location, city, state, date, strconv.Itoa(int(timestamp)), country, description}
                                err := writer.Write(item)
                                if err != nil {
                                        fmt.Println("Error:", err)
                                }
                        })
                }(i)
        }

        wg.Wait()
        writer.Flush()
}
