
package main

import (
	"fmt"
	"io/ioutil"
	"strings"
)

func main() {
	content, err := ioutil.ReadFile("api/main.go")
	if err != nil {
		fmt.Println(err)
		return
	}
	lines := strings.Split(string(content), "\n")
	var newLines []string
	for _, line := range lines {
		if strings.Contains(line, "\"categoryId\":") && strings.Contains(line, "categoryID") {
			continue
		}
		if strings.Contains(line, "\"categoryName\":") && strings.Contains(line, "categoryName") {
			continue
		}
		newLines = append(newLines, line)
	}
	err = ioutil.WriteFile("api/main.go", []byte(strings.Join(newLines, "\n")), 0644)
	if err != nil {
		fmt.Println(err)
		return
	}
	fmt.Println("Done")
}
