export interface Sample {
  name: string;
  category: string;
  description: string;
  code: string;
}

export const samples: Sample[] = [
  {
    name: 'Factorial (Recursive)',
    category: 'Functions',
    description: 'Classic recursive factorial function',
    code: `int factorial(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

int main() {
    int result = factorial(5);
    return result;
}`,
  },
  {
    name: 'Fibonacci',
    category: 'Functions',
    description: 'Iterative Fibonacci computation',
    code: `int fibonacci(int n) {
    int a = 0;
    int b = 1;
    int i = 0;
    while (i < n) {
        int temp = a + b;
        a = b;
        b = temp;
        i++;
    }
    return a;
}

int main() {
    int fib10 = fibonacci(10);
    return fib10;
}`,
  },
  {
    name: 'Bubble Sort',
    category: 'Arrays',
    description: 'Classic sorting algorithm with nested loops',
    code: `void bubbleSort(int arr[], int n) {
    int i;
    for (i = 0; i < n - 1; i++) {
        int j;
        for (j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                int temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
}

int main() {
    int n = 5;
    return 0;
}`,
  },
  {
    name: 'Binary Search',
    category: 'Algorithms',
    description: 'Iterative binary search in a sorted array',
    code: `int binarySearch(int arr[], int n, int target) {
    int low = 0;
    int high = n - 1;
    
    while (low <= high) {
        int mid = low + (high - low) / 2;
        
        if (arr[mid] == target) {
            return mid;
        } else if (arr[mid] < target) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return -1;
}

int main() {
    int n = 8;
    int target = 5;
    int result = binarySearch(0, n, target);
    return result;
}`,
  },
  {
    name: 'Matrix Multiply',
    category: 'Algorithms',
    description: 'Matrix multiplication with triple nested loops',
    code: `void matMul(int A[], int B[], int C[], int n) {
    int i;
    for (i = 0; i < n; i++) {
        int j;
        for (j = 0; j < n; j++) {
            int sum = 0;
            int k;
            for (k = 0; k < n; k++) {
                int aIdx = i * n + k;
                int bIdx = k * n + j;
                sum = sum + A[aIdx] * B[bIdx];
            }
            int cIdx = i * n + j;
            C[cIdx] = sum;
        }
    }
}

int main() {
    int n = 3;
    return 0;
}`,
  },
  {
    name: 'Linked List Traversal',
    category: 'Data Structures',
    description: 'Traversing a linked list and computing sum',
    code: `struct Node {
    int data;
    int next;
};

int sumList(int list[], int head) {
    int sum = 0;
    int current = head;
    while (current != -1) {
        sum = sum + list[current];
        current = list[current + 1];
    }
    return sum;
}

int main() {
    int head = 0;
    int total = sumList(0, head);
    return total;
}`,
  },
  {
    name: 'Recursive Tree Depth',
    category: 'Data Structures',
    description: 'Computing depth of a binary tree recursively',
    code: `int max(int a, int b) {
    if (a > b) {
        return a;
    }
    return b;
}

int treeDepth(int tree[], int node) {
    if (node == -1) {
        return 0;
    }
    int leftChild = tree[node * 2];
    int rightChild = tree[node * 2 + 1];
    int leftDepth = treeDepth(tree, leftChild);
    int rightDepth = treeDepth(tree, rightChild);
    return 1 + max(leftDepth, rightDepth);
}

int main() {
    int root = 0;
    int depth = treeDepth(0, root);
    return depth;
}`,
  },
  {
    name: 'GCD (Euclidean)',
    category: 'Algorithms',
    description: 'Greatest common divisor using Euclid\'s algorithm',
    code: `int gcd(int a, int b) {
    while (b != 0) {
        int temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}

int lcm(int a, int b) {
    return a / gcd(a, b) * b;
}

int main() {
    int g = gcd(48, 18);
    int l = lcm(48, 18);
    return g + l;
}`,
  },
  {
    name: 'Power Function',
    category: 'Functions',
    description: 'Fast exponentiation by squaring',
    code: `int power(int base, int exp) {
    int result = 1;
    while (exp > 0) {
        if (exp % 2 == 1) {
            result = result * base;
        }
        base = base * base;
        exp = exp / 2;
    }
    return result;
}

int main() {
    int p = power(2, 10);
    return p;
}`,
  },
  {
    name: 'If-Else Chain',
    category: 'Control Flow',
    description: 'Nested conditionals with comparisons',
    code: `int classify(int x) {
    int result;
    if (x > 100) {
        result = 3;
    } else if (x > 50) {
        result = 2;
    } else if (x > 0) {
        result = 1;
    } else {
        result = 0;
    }
    return result;
}

int main() {
    int c = classify(75);
    return c;
}`,
  },
  {
    name: 'Arithmetic Expressions',
    category: 'Expressions',
    description: 'Complex arithmetic and operator precedence',
    code: `int main() {
    int a = 5;
    int b = 10;
    int c = 3;
    
    int x = a + b * c;
    int y = (a + b) * c;
    int z = a * b + c * (a - b);
    
    int mod = x % y;
    int shift = a << 2;
    int bitwise = (a & b) | c;
    
    return x + y + z;
}`,
  },
  {
    name: 'While & Do-While',
    category: 'Control Flow',
    description: 'Different loop constructs',
    code: `int main() {
    int sum = 0;
    int i = 1;
    
    while (i <= 10) {
        sum = sum + i;
        i++;
    }
    
    int count = 0;
    do {
        count++;
        sum = sum - count;
    } while (count < 5);
    
    return sum;
}`,
  },
  {
    name: 'For Loop Patterns',
    category: 'Control Flow',
    description: 'Various for loop styles with break/continue',
    code: `int main() {
    int sum = 0;
    int i;
    
    for (i = 0; i < 100; i++) {
        if (i % 2 == 0) {
            continue;
        }
        if (i > 50) {
            break;
        }
        sum += i;
    }
    
    return sum;
}`,
  },
  {
    name: 'Pointer Basics',
    category: 'Pointers',
    description: 'Pointer declaration, dereferencing, and arithmetic',
    code: `void swap(int *a, int *b) {
    int temp = *a;
    *a = *b;
    *b = temp;
}

int main() {
    int x = 10;
    int y = 20;
    int *px = &x;
    int *py = &y;
    
    swap(px, py);
    
    int val = *px + *py;
    return val;
}`,
  },
  {
    name: 'Switch-Case',
    category: 'Control Flow',
    description: 'Switch statement with multiple cases and default',
    code: `int getDaysInMonth(int month) {
    int days;
    switch (month) {
        case 1: case 3: case 5: case 7:
        case 8: case 10: case 12:
            days = 31;
            break;
        case 4: case 6: case 9: case 11:
            days = 30;
            break;
        case 2:
            days = 28;
            break;
        default:
            days = 0;
            break;
    }
    return days;
}

int main() {
    int d = getDaysInMonth(4);
    return d;
}`,
  },
  {
    name: 'Struct Example',
    category: 'Structs',
    description: 'Struct declaration and member access',
    code: `struct Point {
    int x;
    int y;
};

int distance(int x1, int y1, int x2, int y2) {
    int dx = x2 - x1;
    int dy = y2 - y1;
    return dx * dx + dy * dy;
}

int main() {
    int x1 = 3;
    int y1 = 4;
    int x2 = 7;
    int y2 = 1;
    int dist = distance(x1, y1, x2, y2);
    return dist;
}`,
  },
  {
    name: 'Enum Example',
    category: 'Enums',
    description: 'Enum declaration with auto and explicit values',
    code: `enum Color {
    RED,
    GREEN,
    BLUE,
    ALPHA = 10
};

int main() {
    int c = 1;
    int result = 0;

    if (c == 0) {
        result = 255;
    } else if (c == 1) {
        result = 128;
    } else if (c == 2) {
        result = 64;
    }

    return result;
}`,
  },
  {
    name: 'Sizeof Operator',
    category: 'Expressions',
    description: 'Using sizeof for type sizes',
    code: `int main() {
    int intSize = sizeof(int);
    int charSize = sizeof(char);
    int doubleSize = sizeof(double);
    int ptrSize = sizeof(int*);
    
    int total = intSize + charSize + doubleSize + ptrSize;
    return total;
}`,
  },
  {
    name: 'Selection Sort',
    category: 'Algorithms',
    description: 'Selection sort with min-finding inner loop',
    code: `void selectionSort(int arr[], int n) {
    int i;
    for (i = 0; i < n - 1; i++) {
        int minIdx = i;
        int j;
        for (j = i + 1; j < n; j++) {
            if (arr[j] < arr[minIdx]) {
                minIdx = j;
            }
        }
        int temp = arr[i];
        arr[i] = arr[minIdx];
        arr[minIdx] = temp;
    }
}

int main() {
    int n = 6;
    return 0;
}`,
  },
  {
    name: 'Collatz Conjecture',
    category: 'Algorithms',
    description: 'Count steps in the Collatz sequence',
    code: `int collatz(int n) {
    int steps = 0;
    while (n != 1) {
        if (n % 2 == 0) {
            n = n / 2;
        } else {
            n = 3 * n + 1;
        }
        steps++;
    }
    return steps;
}

int main() {
    int s = collatz(27);
    return s;
}`,
  },
  {
    name: 'Stack (Array-Based)',
    category: 'Data Structures',
    description: 'Stack implementation with push, pop, and peek using an array',
    code: `int stack[100];
int top = -1;

void push(int val) {
    top++;
    stack[top] = val;
}

int pop() {
    int val = stack[top];
    top--;
    return val;
}

int peek() {
    return stack[top];
}

int isEmpty() {
    if (top == -1) {
        return 1;
    }
    return 0;
}

int main() {
    push(10);
    push(20);
    push(30);
    int top_val = peek();
    int popped = pop();
    int size = top + 1;
    return popped;
}`,
  },
  {
    name: 'Queue (Circular Array)',
    category: 'Data Structures',
    description: 'Circular queue with enqueue, dequeue, and full/empty checks',
    code: `int queue[100];
int front = 0;
int rear = -1;
int count = 0;

void enqueue(int val) {
    rear = (rear + 1) % 100;
    queue[rear] = val;
    count++;
}

int dequeue() {
    int val = queue[front];
    front = (front + 1) % 100;
    count--;
    return val;
}

int isEmpty() {
    if (count == 0) {
        return 1;
    }
    return 0;
}

int main() {
    enqueue(10);
    enqueue(20);
    enqueue(30);
    int first = dequeue();
    int second = dequeue();
    return first + second;
}`,
  },
  {
    name: 'Linked List Operations',
    category: 'Data Structures',
    description: 'Linked list with insert, delete, and search using struct nodes',
    code: `struct Node {
    int data;
    int next;
};

int nodes[200];
int nodeCount = 0;

int createNode(int data) {
    int idx = nodeCount * 2;
    nodes[idx] = data;
    nodes[idx + 1] = -1;
    nodeCount++;
    return idx;
}

int insertFront(int head, int data) {
    int newNode = createNode(data);
    nodes[newNode + 1] = head;
    return newNode;
}

int search(int head, int target) {
    int current = head;
    while (current != -1) {
        if (nodes[current] == target) {
            return 1;
        }
        current = nodes[current + 1];
    }
    return 0;
}

int length(int head) {
    int count = 0;
    int current = head;
    while (current != -1) {
        count++;
        current = nodes[current + 1];
    }
    return count;
}

int main() {
    int head = -1;
    head = insertFront(head, 30);
    head = insertFront(head, 20);
    head = insertFront(head, 10);
    int found = search(head, 20);
    int len = length(head);
    return len;
}`,
  },
  {
    name: 'Union Example',
    category: 'Unions',
    description: 'Union type with shared memory between int, float, and char members',
    code: `union Value {
    int i;
    float f;
    char c;
};

struct TaggedValue {
    int tag;
    int data;
};

int processValue(int tag, int data) {
    int result = 0;
    if (tag == 0) {
        result = data * 2;
    } else if (tag == 1) {
        result = data + 1;
    } else {
        result = data;
    }
    return result;
}

int main() {
    int tag = 0;
    int intVal = 42;
    int result = processValue(tag, intVal);
    
    tag = 1;
    int floatVal = 3;
    int result2 = processValue(tag, floatVal);
    
    return result + result2;
}`,
  },
  {
    name: 'Typedef Aliases',
    category: 'Typedefs',
    description: 'Type aliases with typedef for cleaner code',
    code: `typedef int size_t;
typedef int bool;

struct Point {
    int x;
    int y;
};

int distanceSquared(int x1, int y1, int x2, int y2) {
    int dx = x2 - x1;
    int dy = y2 - y1;
    return dx * dx + dy * dy;
}

int isCloser(int x1, int y1, int x2, int y2, int threshold) {
    int dist = distanceSquared(x1, y1, x2, y2);
    if (dist < threshold * threshold) {
        return 1;
    }
    return 0;
}

int main() {
    int n = 5;
    int close = isCloser(0, 0, 3, 4, 10);
    return close;
}`,
  },
  {
    name: 'Function Pointers',
    category: 'Pointers',
    description: 'Simulated function pointer dispatch using switch-case',
    code: `int add(int a, int b) {
    return a + b;
}

int subtract(int a, int b) {
    return a - b;
}

int multiply(int a, int b) {
    return a * b;
}

int applyOp(int op, int a, int b) {
    int result = 0;
    switch (op) {
        case 0:
            result = add(a, b);
            break;
        case 1:
            result = subtract(a, b);
            break;
        case 2:
            result = multiply(a, b);
            break;
        default:
            result = 0;
            break;
    }
    return result;
}

int main() {
    int sum = applyOp(0, 10, 5);
    int diff = applyOp(1, 10, 5);
    int prod = applyOp(2, 10, 5);
    return sum + diff + prod;
}`,
  },
  {
    name: 'Multi-Dim Array',
    category: 'Arrays',
    description: 'Simulated 2D array operations with row-major layout',
    code: `int get2D(int arr[], int cols, int row, int col) {
    return arr[row * cols + col];
}

void set2D(int arr[], int cols, int row, int col, int val) {
    arr[row * cols + col] = val;
}

void transpose(int src[], int dst[], int rows, int cols) {
    int i;
    for (i = 0; i < rows; i++) {
        int j;
        for (j = 0; j < cols; j++) {
            int srcIdx = i * cols + j;
            int dstIdx = j * rows + i;
            dst[dstIdx] = src[srcIdx];
        }
    }
}

int trace(int arr[], int n) {
    int sum = 0;
    int i;
    for (i = 0; i < n; i++) {
        sum = sum + arr[i * n + i];
    }
    return sum;
}

int main() {
    int n = 3;
    int t = trace(0, n);
    return t;
}`,
  },
  {
    name: 'Hash Table (Simple)',
    category: 'Data Structures',
    description: 'Simple hash map with linear probing collision resolution',
    code: `int keys[64];
int values[64];
int used[64];

int hash(int key) {
    int h = key % 64;
    if (h < 0) {
        h = h + 64;
    }
    return h;
}

void init() {
    int i;
    for (i = 0; i < 64; i++) {
        used[i] = 0;
    }
}

void put(int key, int value) {
    int idx = hash(key);
    while (used[idx] == 1) {
        if (keys[idx] == key) {
            values[idx] = value;
            return;
        }
        idx = (idx + 1) % 64;
    }
    keys[idx] = key;
    values[idx] = value;
    used[idx] = 1;
}

int get(int key) {
    int idx = hash(key);
    while (used[idx] == 1) {
        if (keys[idx] == key) {
            return values[idx];
        }
        idx = (idx + 1) % 64;
    }
    return -1;
}

int main() {
    init();
    put(42, 100);
    put(17, 200);
    put(106, 300);
    int a = get(42);
    int b = get(17);
    return a + b;
}`,
  },
  {
    name: 'Priority Queue (Heap)',
    category: 'Data Structures',
    description: 'Min-heap priority queue with insert and extract-min',
    code: `int heap[100];
int heapSize = 0;

void swap_heap(int i, int j) {
    int temp = heap[i];
    heap[i] = heap[j];
    heap[j] = temp;
}

void siftUp(int idx) {
    while (idx > 0) {
        int parent = (idx - 1) / 2;
        if (heap[idx] < heap[parent]) {
            swap_heap(idx, parent);
            idx = parent;
        } else {
            break;
        }
    }
}

void siftDown(int idx) {
    while (idx * 2 + 1 < heapSize) {
        int left = idx * 2 + 1;
        int right = idx * 2 + 2;
        int smallest = idx;
        if (heap[left] < heap[smallest]) {
            smallest = left;
        }
        if (right < heapSize) {
            if (heap[right] < heap[smallest]) {
                smallest = right;
            }
        }
        if (smallest != idx) {
            swap_heap(idx, smallest);
            idx = smallest;
        } else {
            break;
        }
    }
}

void insert(int val) {
    heap[heapSize] = val;
    heapSize++;
    siftUp(heapSize - 1);
}

int extractMin() {
    int min = heap[0];
    heapSize--;
    heap[0] = heap[heapSize];
    siftDown(0);
    return min;
}

int main() {
    insert(30);
    insert(10);
    insert(20);
    insert(5);
    int first = extractMin();
    int second = extractMin();
    return first + second;
}`,
  },
  {
    name: 'DFS Traversals (In/Pre/Post)',
    category: 'Tree Algorithms',
    description: 'Binary tree inorder, preorder, and postorder depth-first traversals',
    code: `int tree_val[100];
int tree_left[100];
int tree_right[100];
int result[100];
int resIdx = 0;

void inorder(int node) {
    if (node == -1) {
        return;
    }
    inorder(tree_left[node]);
    result[resIdx] = tree_val[node];
    resIdx++;
    inorder(tree_right[node]);
}

void preorder(int node) {
    if (node == -1) {
        return;
    }
    result[resIdx] = tree_val[node];
    resIdx++;
    preorder(tree_left[node]);
    preorder(tree_right[node]);
}

void postorder(int node) {
    if (node == -1) {
        return;
    }
    postorder(tree_left[node]);
    postorder(tree_right[node]);
    result[resIdx] = tree_val[node];
    resIdx++;
}

void buildSampleTree() {
    tree_val[0] = 4;  tree_left[0] = 1;  tree_right[0] = 2;
    tree_val[1] = 2;  tree_left[1] = 3;  tree_right[1] = 4;
    tree_val[2] = 6;  tree_left[2] = 5;  tree_right[2] = 6;
    tree_val[3] = 1;  tree_left[3] = -1; tree_right[3] = -1;
    tree_val[4] = 3;  tree_left[4] = -1; tree_right[4] = -1;
    tree_val[5] = 5;  tree_left[5] = -1; tree_right[5] = -1;
    tree_val[6] = 7;  tree_left[6] = -1; tree_right[6] = -1;
}

int main() {
    buildSampleTree();

    resIdx = 0;
    inorder(0);
    int inorderCount = resIdx;

    resIdx = 0;
    preorder(0);
    int preorderCount = resIdx;

    resIdx = 0;
    postorder(0);
    int postorderCount = resIdx;

    return inorderCount + preorderCount + postorderCount;
}`,
  },
  {
    name: 'BFS / Level-Order',
    category: 'Tree Algorithms',
    description: 'Breadth-first level-order traversal using a queue',
    code: `int tree_val[100];
int tree_left[100];
int tree_right[100];
int queue[100];
int result[100];

void buildTree() {
    tree_val[0] = 1;  tree_left[0] = 1;  tree_right[0] = 2;
    tree_val[1] = 2;  tree_left[1] = 3;  tree_right[1] = 4;
    tree_val[2] = 3;  tree_left[2] = 5;  tree_right[2] = -1;
    tree_val[3] = 4;  tree_left[3] = -1; tree_right[3] = -1;
    tree_val[4] = 5;  tree_left[4] = -1; tree_right[4] = -1;
    tree_val[5] = 6;  tree_left[5] = -1; tree_right[5] = -1;
}

int bfs(int root) {
    int front = 0;
    int rear = 0;
    int count = 0;

    queue[rear] = root;
    rear++;

    while (front < rear) {
        int node = queue[front];
        front++;

        if (node == -1) {
            continue;
        }

        result[count] = tree_val[node];
        count++;

        if (tree_left[node] != -1) {
            queue[rear] = tree_left[node];
            rear++;
        }
        if (tree_right[node] != -1) {
            queue[rear] = tree_right[node];
            rear++;
        }
    }
    return count;
}

int main() {
    buildTree();
    int visited = bfs(0);
    return visited;
}`,
  },
  {
    name: 'BST Insert & Search',
    category: 'Tree Algorithms',
    description: 'Binary Search Tree with insert, search, and find-min operations',
    code: `int bst_val[100];
int bst_left[100];
int bst_right[100];
int nodeCount = 0;

int createNode(int val) {
    int idx = nodeCount;
    bst_val[idx] = val;
    bst_left[idx] = -1;
    bst_right[idx] = -1;
    nodeCount++;
    return idx;
}

int insert(int root, int val) {
    if (root == -1) {
        return createNode(val);
    }
    if (val < bst_val[root]) {
        bst_left[root] = insert(bst_left[root], val);
    } else if (val > bst_val[root]) {
        bst_right[root] = insert(bst_right[root], val);
    }
    return root;
}

int search(int root, int val) {
    if (root == -1) {
        return 0;
    }
    if (val == bst_val[root]) {
        return 1;
    }
    if (val < bst_val[root]) {
        return search(bst_left[root], val);
    }
    return search(bst_right[root], val);
}

int findMin(int root) {
    if (root == -1) {
        return -1;
    }
    while (bst_left[root] != -1) {
        root = bst_left[root];
    }
    return bst_val[root];
}

int treeHeight(int root) {
    if (root == -1) {
        return 0;
    }
    int leftH = treeHeight(bst_left[root]);
    int rightH = treeHeight(bst_right[root]);
    if (leftH > rightH) {
        return leftH + 1;
    }
    return rightH + 1;
}

int main() {
    int root = -1;
    root = insert(root, 50);
    root = insert(root, 30);
    root = insert(root, 70);
    root = insert(root, 20);
    root = insert(root, 40);
    root = insert(root, 60);
    root = insert(root, 80);

    int found1 = search(root, 40);
    int found2 = search(root, 25);
    int min = findMin(root);
    int height = treeHeight(root);

    return found1 + found2 + min + height;
}`,
  },
  {
    name: 'AVL Tree (Rotations)',
    category: 'Tree Algorithms',
    description: 'Self-balancing AVL tree with left/right rotations on insert',
    code: `int avl_val[100];
int avl_left[100];
int avl_right[100];
int avl_height[100];
int avlCount = 0;

int createNode(int val) {
    int idx = avlCount;
    avl_val[idx] = val;
    avl_left[idx] = -1;
    avl_right[idx] = -1;
    avl_height[idx] = 1;
    avlCount++;
    return idx;
}

int height(int node) {
    if (node == -1) {
        return 0;
    }
    return avl_height[node];
}

int max(int a, int b) {
    if (a > b) {
        return a;
    }
    return b;
}

int getBalance(int node) {
    if (node == -1) {
        return 0;
    }
    return height(avl_left[node]) - height(avl_right[node]);
}

void updateHeight(int node) {
    int lh = height(avl_left[node]);
    int rh = height(avl_right[node]);
    avl_height[node] = 1 + max(lh, rh);
}

int rotateRight(int y) {
    int x = avl_left[y];
    int t2 = avl_right[x];

    avl_right[x] = y;
    avl_left[y] = t2;

    updateHeight(y);
    updateHeight(x);
    return x;
}

int rotateLeft(int x) {
    int y = avl_right[x];
    int t2 = avl_left[y];

    avl_left[y] = x;
    avl_right[x] = t2;

    updateHeight(x);
    updateHeight(y);
    return y;
}

int avlInsert(int node, int val) {
    if (node == -1) {
        return createNode(val);
    }
    if (val < avl_val[node]) {
        avl_left[node] = avlInsert(avl_left[node], val);
    } else if (val > avl_val[node]) {
        avl_right[node] = avlInsert(avl_right[node], val);
    } else {
        return node;
    }

    updateHeight(node);
    int balance = getBalance(node);

    if (balance > 1) {
        if (val < avl_val[avl_left[node]]) {
            return rotateRight(node);
        } else {
            avl_left[node] = rotateLeft(avl_left[node]);
            return rotateRight(node);
        }
    }
    if (balance < -1) {
        if (val > avl_val[avl_right[node]]) {
            return rotateLeft(node);
        } else {
            avl_right[node] = rotateRight(avl_right[node]);
            return rotateLeft(node);
        }
    }
    return node;
}

int inorderCount(int node) {
    if (node == -1) {
        return 0;
    }
    return inorderCount(avl_left[node]) + 1 + inorderCount(avl_right[node]);
}

int main() {
    int root = -1;
    root = avlInsert(root, 10);
    root = avlInsert(root, 20);
    root = avlInsert(root, 30);
    root = avlInsert(root, 40);
    root = avlInsert(root, 50);
    root = avlInsert(root, 25);

    int h = height(root);
    int count = inorderCount(root);
    int bal = getBalance(root);

    return h + count + bal;
}`,
  },
  {
    name: 'Tree Diameter',
    category: 'Tree Algorithms',
    description: 'Find the diameter (longest path) of a binary tree',
    code: `int tree_val[100];
int tree_left[100];
int tree_right[100];
int maxDiameter = 0;

int max(int a, int b) {
    if (a > b) {
        return a;
    }
    return b;
}

void buildTree() {
    tree_val[0] = 1;  tree_left[0] = 1;  tree_right[0] = 2;
    tree_val[1] = 2;  tree_left[1] = 3;  tree_right[1] = 4;
    tree_val[2] = 3;  tree_left[2] = -1; tree_right[2] = -1;
    tree_val[3] = 4;  tree_left[3] = 5;  tree_right[3] = -1;
    tree_val[4] = 5;  tree_left[4] = -1; tree_right[4] = 6;
    tree_val[5] = 6;  tree_left[5] = -1; tree_right[5] = -1;
    tree_val[6] = 7;  tree_left[6] = -1; tree_right[6] = -1;
}

int depthAndDiameter(int node) {
    if (node == -1) {
        return 0;
    }
    int leftDepth = depthAndDiameter(tree_left[node]);
    int rightDepth = depthAndDiameter(tree_right[node]);

    int pathThroughNode = leftDepth + rightDepth;
    if (pathThroughNode > maxDiameter) {
        maxDiameter = pathThroughNode;
    }

    return 1 + max(leftDepth, rightDepth);
}

int main() {
    buildTree();
    maxDiameter = 0;
    int h = depthAndDiameter(0);
    return maxDiameter;
}`,
  },
  {
    name: 'Lowest Common Ancestor',
    category: 'Tree Algorithms',
    description: 'Find LCA of two nodes in a BST',
    code: `int bst_val[100];
int bst_left[100];
int bst_right[100];
int nodeCount = 0;

int createNode(int val) {
    int idx = nodeCount;
    bst_val[idx] = val;
    bst_left[idx] = -1;
    bst_right[idx] = -1;
    nodeCount++;
    return idx;
}

int insert(int root, int val) {
    if (root == -1) {
        return createNode(val);
    }
    if (val < bst_val[root]) {
        bst_left[root] = insert(bst_left[root], val);
    } else if (val > bst_val[root]) {
        bst_right[root] = insert(bst_right[root], val);
    }
    return root;
}

int lca(int root, int p, int q) {
    if (root == -1) {
        return -1;
    }
    if (p < bst_val[root]) {
        if (q < bst_val[root]) {
            return lca(bst_left[root], p, q);
        }
    }
    if (p > bst_val[root]) {
        if (q > bst_val[root]) {
            return lca(bst_right[root], p, q);
        }
    }
    return bst_val[root];
}

int main() {
    int root = -1;
    root = insert(root, 20);
    root = insert(root, 10);
    root = insert(root, 30);
    root = insert(root, 5);
    root = insert(root, 15);
    root = insert(root, 25);
    root = insert(root, 35);

    int ancestor1 = lca(root, 5, 15);
    int ancestor2 = lca(root, 5, 35);
    int ancestor3 = lca(root, 25, 35);

    return ancestor1 + ancestor2 + ancestor3;
}`,
  },
];
