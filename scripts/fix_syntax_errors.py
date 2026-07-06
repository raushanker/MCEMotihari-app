import re

with open('src/components/modals/FastLoginModal.tsx', 'r') as f:
    content = f.read()
content = content.replace("hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}\n              <Ionicons", "hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>\n              <Ionicons")
with open('src/components/modals/FastLoginModal.tsx', 'w') as f:
    f.write(content)

with open('src/components/modals/NoticesWebModal.tsx', 'r') as f:
    content = f.read()
# there is an extra </View> at the end
content = content.replace("""          </View>
          </View>
        </View>
      </View>
    </Modal>""", """          </View>
        </View>
      </View>
    </Modal>""")
with open('src/components/modals/NoticesWebModal.tsx', 'w') as f:
    f.write(content)

