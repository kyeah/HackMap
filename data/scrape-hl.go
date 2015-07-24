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
	hl_prefix := "https://hackerleague.org"

        csvfile, err := os.Create("output.csv")
        if err != nil {
                fmt.Println("Error:", err)
                return
        }
        defer csvfile.Close()

        writer := csv.NewWriter(csvfile)
	
        var wg sync.WaitGroup
        wg.Add(88)
        for i := 1; i <= 88; i++ {
                go func(page int) {
                        defer wg.Done()
                        url := fmt.Sprintf("https://www.hackerleague.org/hackathons/past?page=%v", page)
                        doc, err := goquery.NewDocument(url)
                        if err != nil {
                                fmt.Printf("FAILED\n")
                        }

                        // Find each hackathon
                        doc.Find("h5 a").Each(func(i int, s *goquery.Selection) {
                                href, exists := s.Attr("href")
                                if !exists {
                                        fmt.Printf("NO HREF\n")
                                } else {
					href = strings.Replace(href, 'https://', 'http://', 1)
				}

                                name := s.Text()
                                var image string

                                var prev = s.Parent().Prev()
                                if prev.HasClass("hackathon-image") {
                                        image_src, _ := prev.Find("a img").First().Attr("src")
                                        image = image_src
                                }

                                var sibling = s.Parent().Next()
                                var location string
                                var date string

                                // Grab location, if available
                                if sibling.HasClass("text-uppercase") {
                                        location = sibling.Text()
                                        sibling = sibling.Next()
                                }

                                // Grab date
                                if sibling.HasClass("hackathon_date") {
                                        date = sibling.Text()
                                }

                                fmt.Printf("href: %s\nname: %s\nlocation: %s\ndate: %s\nimage: %s\n", href, name, location, date, image)

				var city string
				var state string
				if location != "" {
					arr := strings.SplitN(location, ",", 2)
					city = strings.Trim(arr[0], " ")
					state = strings.Trim(arr[1], " ")
				}

				var timestamp int64
				var year string
				if date != "" {
					year = date[len(date)-4: len(date)]
					date_parse, _ := strconv.ParseInt(year, 0, 32)
					stuff_parse := month_to_int(date[0:3])
					timestamp = 12*(date_parse - 2011) + stuff_parse
				}

				// Write csv
				item := []string{hl_prefix + href, name, hl_prefix + image, location, city, state, date, strconv.Itoa(int(timestamp)), "", "", year}
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
