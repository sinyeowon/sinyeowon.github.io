---
layout: "post"
title: "[Java] Programmers - Java Basics"
date: 2026-10-19 00:00:00 +0900
last_modified_at: 2026-10-19 23:27:00 +0900
categories: ["Programmers", "Java"]
tags: ["Java", "programmers"]
description: "[Java] This article summarizes the process of solving basic Java problems for programmers."
description_source: "excerpt"
lang: "en"
ui_lang: "ko-KR"
toc: true
permalink: "/en/posts/Java-프로그래머스-Java-기초/"
original_url: "/posts/Java-프로그래머스-Java-기초/"
notion_id: "3fe7788a-fc66-8090-b853-d923f60f4789"
notion_lang: "en"
---
### Find the quotient

<a class="notion-mention" href="https://school.programmers.co.kr/learn/courses/30/lessons/120805">https://school.programmers.co.kr/learn/courses/30/lessons/120805</a>

To get the quotient in Java, you must use `/`.

Integer / Integer → Returns the quotient of an integer value.

Real number / Integer → If at least one of the numbers is a real number, the quotient of the real number is provided.

In Java, the `//` symbol means a comment, so the quotient cannot be obtained with `//` like in Python.

### Addition of fractions

<a class="notion-mention" href="https://school.programmers.co.kr/learn/courses/30/lessons/120808">https://school.programmers.co.kr/learn/courses/30/lessons/120808</a>

```java
class Solution {
    public int[] solution(int numer1, int denom1, int numer2, int denom2) {
        int[] answer = new int[2];
        
        answer[0] = numer1*denom2 + numer2*denom1;
        answer[1] = denom1 * denom2;
        
        while(answer[0] != 1) {
            for(int i = answer[1]; i>=1; i--) {
                if (answer[0] % i == 0 && answer[1] % i == 0) {
                    answer[0] /= i;
                    answer[1] /= i;
                
                }
            }
        }
        
        return answer;
    }
}
```

- Error in the first code
    - Just because it is an irreducible fraction does not mean that all numerators are 1.
        - Even if the numerator is not 1, the repetition must end when it becomes an irreducible fraction.

    - To reduce, the priority is to find the smaller value between the numerator and the denominator.

    - Also, in the for statement that repeats from the denominator number to 1, 1 has no meaning in the short form, so there is no need to check it.

    ```java
    class Solution {
        public int[] solution(int numer1, int denom1, int numer2, int denom2) {
            int[] answer = new int[2];
            
            answer[0] = numer1*denom2 + numer2*denom1;
            answer[1] = denom1 * denom2;
            
            for(int i = Math.min(answer[0], answer[1]); i>=2; i--) {
                if (answer[0] % i == 0 && answer[1] % i == 0) {
                    answer[0] /= i;
                    answer[1] /= i;
                    break;
                }
            }
            
            return answer;
        }
    }
    ```

- Code after modification
    - **If you divide by the greatest common divisor, it becomes an irreducible fraction** → There is no need for the `while` statement.

    - Use `Math.min()` → Returns the smaller of the numerator and denominator

### Find median

<a class="notion-mention" href="https://school.programmers.co.kr/learn/courses/30/lessons/120811">https://school.programmers.co.kr/learn/courses/30/lessons/120811</a>

- Arrays in Java

    - Array declaration

```java
        int[] arr;
        ```

    - Create array

        ```java
        int[] arr = new int[5];
        ```

    - Initialization at the same time as array declaration

        ```java
        int[] arr = {10, 20. 30, 40, 50};
        ```

    - Check array length

        ```java
        len = arr.length;
        System.out.println(arr.length);
        ```

    - Array sorting

        - Use `Arrays.sort()` method

            ```java
            import java.util.Arrays;

            int[] arr = {5, 2, 8, 1, 3};

            Arrays.sort(arr);

            System.out.println(Arrays.toString(arr));
            // [1, 2, 3, 5, 8]
            ```

            - `Arrays.sort(arr);` → Sort the array in ascending order

            - `Arrays.toString(arr)` → Outputs the elements of the array in string form.

                - If you just use `System.out.println(arr);` → a string indicating the type and hash code of the array is output, not the elements of the array.

                    ```java
                    [I@15db9742
                    ```

                ```java
                import java.util.Arrays;
                import java.util.Collections;

                Integer[] arr = {5, 2, 8, 1, 3};

                Arrays.sort(arr, Collections.reverseOrder());

                System.out.println(Arrays.toString(arr));
                // [8, 5, 3, 2, 1]
                ```

            - `Arrays.sort(arr, Collections.reverseOrder());`<br>
                → Sort in descending order

                - `Collections.reverseOrder()` → Comparison criteria used for sorting in descending order

            - You must use the `Integer[]` array, not `int[]`.<br>
                <div class="notion-callout" markdown="1">

                <div class="notion-callout-heading">
                <span class="notion-callout-icon">💡</span>
                </div>

                `int[]` is a basic data type array.
                `Integer[]` is a reference type array.

                <div class="notion-indent" markdown="1">- `Integer` is a wrapper class to handle `int` as an object.

                - `Integer[]` is an array that stores references to `Integer` objects

                </div>

                → `Collections.reverseOrder()` returns `Comparator`, which compares objects. Therefore, `Arrays.sort(배열, Comparator)` can only be used in object arrays, so it cannot be applied to `int[]`.

                </div>

### Find the mode

<a class="notion-mention" href="https://school.programmers.co.kr/learn/courses/30/lessons/120812">https://school.programmers.co.kr/learn/courses/30/lessons/120812</a>

#### My solution

```java
class Solution {
    public int solution(int[] array) {
        int[] answer = new int[1000];
        
        for(int i = 0; i<array.length; i++) {
            
            answer[array[i]] += 1;
        }
        
        int[] max = new int[3]; // 0: max 값 1: max 인덱스 2: 그 전 max 값
        max[0] = 0;
        
        for(int i = 0; i<answer.length; i++) {
            if(answer[i] > max[0]) {
                max[0] = answer[i];
                max[2] = answer[i];
                max[1] = i;
            } else if (answer[i] == max[0]) {
                max[2] = -1;
            }
        }
        
        if (max[2] != -1) {
            return max[1];
        } else {
            return -1;
        }
    }
}
```

#### Better solution

```java
class Solution {
    public int solution(int[] array) {
        int[] count = new int[1000];

        for (int num : array) {
            count[num]++;
        }

        int max = 0;
        int answer = 0;

        for (int i = 0; i < count.length; i++) {
            if (count[i] > max) {
                max = count[i];
                answer = i;
            } else if (count[i] == max) {
                answer = -1;
            }
        }

        return answer;
    }
}
```

- Improved use of for loop<br>
    Using `for(int num : array)`, take out the elements of the array one by one and assign them to num.

- Use variable instead of max array
    - An array was created to check for duplicates, but since it is not needed, the mode value can be checked directly as a variable.

    - If the mode value is duplicated while looping through the for loop until the end, -1, and if the new value is greater than the saved max value, it is saved as the mode value again.

#### Another solution

```java
import java.util.HashMap;

class Solution {
    public int solution(int[] array) {
        HashMap<Integer, Integer> map = new HashMap<>();

        for (int num : array) {
            map.put(num, map.getOrDefault(num, 0) + 1);
        }

        int max = 0;
        int answer = 0;

        for (int num : map.keySet()) {
            int count = map.get(num);

            if (count > max) {
                max = count;
                answer = num;
            } else if (count == max) {
                answer = -1;
            }
        }

        return answer;
    }
}
```

- Utilization of `HashMap`<br>
    It is simpler to use an array for the problem, but if the number range is large or contains negative numbers, you can also use `HashMap`.

    `map.put(num, map.getOrDerfault(num, 0) + 1);` → `getOrDefault(num, 0)` retrieves the number of existing appearances if the number is already stored, and returns 0 if not.

### I hate even numbers<a class="notion-mention" href="https://school.programmers.co.kr/learn/courses/30/lessons/120813">https://school.programmers.co.kr/learn/courses/30/lessons/120813</a>

#### Solution

```java
import java.util.ArrayList;
import java.util.Arrays;

class Solution {
    public int[] solution(int n) {
        ArrayList<Integer> array = new ArrayList<>();
        
        for(int i = 1; i<=n; i++) {
            if(i%2 != 0) {
                array.add(i);
            }
        }
        
        int[] answer = array.stream().mapToInt(Integer::intValue).toArray();
        
        return answer;
    }
}
```

An array must be returned in the answer, but since I did not know how many values would be in the array while solving the problem, I used `ArrayList`.

- `ArrayList`
    - An array-based data structure whose size dynamically changes provided by Java.

    - No need to specify the number of elements initially
        - Internal storage automatically expands as needed as you add elements

    - Check element count with `arr.size()`

    - Basic data types such as `int` and `double` cannot be used as type arguments.
        - Uses `int` presidential election wrapper class `Integer`

- `int[] answer = array.stream().mapToInt(Integer::intValue).toArray();`
    - `stream()` → Create `Strem` so that the elements of the list can be processed in order.

    - Convert `mapToInt(Integer::intValue)` → `Integer` objects to basic data type `int` values.

    - `toArray()` → Return the converted values in an array

    <div class="notion-callout" markdown="1">

    <div class="notion-callout-heading">
    <span class="notion-callout-icon">💡</span>
    </div>

    - Declare as ArrayList<br>
    `ArrayList<Integer> array = new ArrayList<>();`→ Variable type: `ArrayList`, actual created object: `ArrayList`

    - Declare as List<br>
    `List<Integer> array = new ArrayList<>();`

    → Variable type: `List`, actual created object: `ArrayList`

    ⇒ `List` is an interface, and `ArrayList` is a class that implements the List interface.

    ![image](/assets/img/notion/Java-프로그래머스-Java-기초/01-7720afa881.png)

    - Reason for declaring as List<br>
    If you declare it as `List<Integer> array = new ArrayList<>();` and later want to change it to `LinkedList` → just change the part that creates the object to `List<Integer> array = new LinkedList<>();`.
    (Of course, LinkedList must also be imported separately)

    ⇒ Therefore, variables are generally declared as interface types, and actual objects are created as implementation classes.

    </div>

### Flipped string

<a class="notion-mention" href="https://school.programmers.co.kr/learn/courses/30/lessons/120822">https://school.programmers.co.kr/learn/courses/30/lessons/120822</a>

#### Java string

- String declaration and initialization<br>
    `String str = "Hello";` `String str2 = new String("Hello");`

- Difference between String and char
    ![image](/assets/img/notion/Java-프로그래머스-Java-기초/02-9f63b9a389.png)

- Main methods related to strings
    ![image](/assets/img/notion/Java-프로그래머스-Java-기초/03-5916aff0b3.png)

- String concatenation<br>
    In Java, you can concatenate strings using the `+` operator.

- String comparison<br>
    When comparing the contents of strings, `equals()` must be used.

    The reason why `==` cannot be used → Because the addresses are compared to see if the two variables refer to the same object.- Strings are immutable objects<br>
    Once Java's `String` is created, the contents of the object cannot be changed.

    ```java
    String str = "Hello";

    str.replace("H", "J");

    System.out.println(str); // Hello
    ```

    → `replace()` returns a new string rather than modifying the original string.

    <div class="notion-indent" markdown="1">

    ```java
        str = str.replace("H", "J");

        System.out.println(str); // Jello
        ```

    </div>

### Age of exoplanets

<a class="notion-mention" href="https://school.programmers.co.kr/learn/courses/30/lessons/120834">https://school.programmers.co.kr/learn/courses/30/lessons/120834</a>

#### Solution

```java
class Solution {
    public String solution(int age) {
        String answer = "";
        
        String alpha = "abcdefghij";
        
        String str = String.valueOf(age);
        
        for (int i = 0; i < str.length(); i++) {
            int num = str.charAt(i) - '0';
            answer += alpha.charAt(num);
        }
        
        return answer;
    }
}
```

- Convert numbers to strings<br>
    `String str = String.valueOf(age);` → Convert the number to a string and use `charAt()` to access each digit.

- Convert letters to numbers<br>
    `int num = str.charAt(i) - '0';` → `charAt()` returns type `char`
    ⇒ What you need is an integer number index! → **If you perform a subtraction operation between characters in Java, the calculation is based on the Unicode value, so numeric characters are converted to integers like `‘2’ - ‘0’`.
